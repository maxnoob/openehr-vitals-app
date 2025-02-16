<!-- The EHR API documentation can be found at:
https://specifications.openehr.org/releases/ITS-REST/Release-1.0.3/ehr.html#tag/COMPOSITION
 -->

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import webTemplate from '@/assets/web templates/task1_vital_signs_fabianb.v0.json';
import { useToast } from "primevue/usetoast";
const toast = useToast();

const showToast = (severity, summary, detail, life = 3000) => {
    console.log("toast loading")
    toast.add({ severity, summary, detail, life});
};

const storedCompositions = ref([]);
const selectedComposition = ref(null);
const loading = ref(false);
const error = ref(null);

const form = ref(null);
// const templatePath = '/templates/web%20templates/task1_vital_signs_fabianb.v0.json'
const exampleData = ref(null);

// const BASE_URL = 'https://openehr-bootcamp.medblocks.com/ehrbase' // use this as proxy in vite.config to avoid CORS problems 
// const OPENEHR_BASE_URL = `${BASE_URL}/rest/openehr/v1`  
const OPENEHR_BASE_URL = '/api/ehrbase/rest/openehr/v1' // use this to avoid CORS problem in development

const ehrId = '71cc9c05-7d1a-4726-bb20-6d4b33c2ba30'
let templateId = null 

// Computed property to check if updating or saving
const buttonLabel = computed(() => selectedComposition.value ? "Update values" : "Save values");

// Fetch and assign the JSON web template to form.webTemplate
async function loadTemplateForm() {
    await nextTick(); // Ensure the component is rendered before modifying it
    // Assign locally imported JSON to the form element
    if (form.value) {
        form.value.webTemplate = webTemplate;
        templateId = form.value.webTemplate.templateId;
        console.log("Template ID: " + templateId);
        // Fetch example data after templateId is set
        await getExampleComposition();
        await listCompositions();
    } else {
        console.error('Form element not found');
    }
}

// Fetch example JSON from the API
// To get FLAT JSON 'Accept': 'application/openehr.wt.flat.schema+json'
// maybe this function is unnecessary...
async function getExampleComposition() {
  if (!templateId) {
        console.error("Template ID is not set.");
        return;
    }
    try {
        const response = await fetch(`${OPENEHR_BASE_URL}/definition/template/adl1.4/${templateId}/example`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        exampleData.value = await response.json();
        console.log('Fetched example JSON:', exampleData.value);

    } catch (error) {
        console.error('Error fetching example JSON:', error);
    }
}

async function postComposition() {
  const composition = form.value.export() /* Medblocks UI specific? */
  console.log(composition);
  try {
        let url = `${OPENEHR_BASE_URL}/ehr/${ehrId}/composition`;
        let method = 'POST'; // default to creating a new composition
        let headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/openehr.wt.flat.schema+json', // form.value.export() returns flat json
                'Prefer': "return=presentation"
            }
        // if editing an existing composition, update it via PUT instead
        // NOTE: selectedComposition.value is a FLAT JSON, that was retrieved to populate the form, if an already existing composition was selected
        if (selectedComposition.value) {
            const fullVersionUid = selectedComposition.value?.[`${templateId}/_uid`]; // fullVersionUid necessary for the required Header Parameters (If-Match)
            const hierObjectId = fullVersionUid?.split('::')[0]; // Extract HIER_OBJECT_ID from versioned UID, for the PUT request (update)
            console.log("fullVersionUid: " + fullVersionUid + "; hierObjectId: " + hierObjectId);
            url += `/${hierObjectId}?templateId=${templateId}`; // ?templateId necessary, if not normal JSON is sent!
            method = 'PUT';
            headers['If-Match'] = `${fullVersionUid}`; // Required! To avoid 'mid-air' collision
        } else {
            url += `?templateId=${templateId}`;
        }

        const response = await fetch(url, {
            method,
            body: JSON.stringify(composition),
            headers
        });
        showToast('success','Saved', 'Values successfully saved');
        form.value.import({}); // creates an empty form, to clear the existing form
        await listCompositions();
  }
  catch (error) {
        console.error('Error posting the composition:', error);
    }
}

async function listCompositions() {
  try {
        const response = await fetch(`${OPENEHR_BASE_URL}/query/aql`, {
            method: 'POST',
            body: JSON.stringify({
              "q": `SELECT c/uid/value, c/context/start_time/value FROM EHR e[ehr_id/value = '${ehrId}'] CONTAINS COMPOSITION c WHERE c/archetype_details/template_id/value = '${templateId}'`
          }), // always stringify the body!
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
          const errorMessage = await response.text(); // get exact server response
          throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
      }
        const responseData = await response.json();
        //storedCompositions.value = responseData
        console.log("Stored Compositions:", responseData);
        const rows = responseData.rows
        storedCompositions.value = rows
            .map(([uid,timestamp]) => ({uid,timestamp}))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by date (descending)
        console.log("Compositions: " + storedCompositions);
        
  }
  catch (error) {
        console.error('Error querying the compositions:', error);
    }
}

/* When clicking on the delete button, found on the composition card,
a DELETE request will be sent to the ehrBase server, to delete this version of the composition.
This won't hard-delete the composition, but it won't appear in regular queries anymore.
Hard-deletion is not possible via the REST API */
async function deleteComposition(uid) {
    if (!uid) {
        console.error("Invalid UID for deletion");
    return;
  }

  console.log("Deleting composition with UID:", uid);
  try {
        const response = await fetch(`${OPENEHR_BASE_URL}/ehr/${ehrId}/composition/${uid}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json', // form.value.export() returns flat json
                'Prefer': "return=presentation"
            }
        });
        console.log("Composition deleted successfully");
        showToast('secondary','Deleted', 'Composition successfully deleted');
        await listCompositions();
  }
  catch (error) {
        console.error('Error deleting the composition:', error);
    }
}


async function loadComposition(uid) {
    if (!uid) {
        console.error("Invalid UID for loading composition");
        return;
    }
    console.log("Loading composition with UID:", uid);

    try {
        const response = await fetch(`${OPENEHR_BASE_URL}/ehr/${ehrId}/composition/${uid}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/openehr.wt.flat.schema+json', /* Medblocks UI always expects FLAT JSON */
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorMessage}`);
        }
        // load values into the form. beware that the response is a FLAT JSON, as required by Medblocks UI.
        selectedComposition.value = await response.json();
        console.log("API Response:", selectedComposition.value);
        form.value.import(selectedComposition.value);
        showToast('info', 'Composition Loaded', 'Now editing the selected composition.');

    } catch (error) {
        console.error('Error loading the composition:', error);
        showToast('error', 'Error', 'Failed to load composition.');
    }
}

function resetForm() {
    selectedComposition.value = null; // clear selected composition
    form.value.import({}); // reset form
    showToast('info', 'New Composition', 'Ready to create a new composition.');
}

onMounted(() => {
  loadTemplateForm();
});

</script>

<template>
    <div class="vitals-form-container">
        <!-- Left Side: Form Section -->
        <div class="form-section">
            <h1>openEHR Vitals Form</h1>
            Current EHR ID: {{ ehrId }}
            <h2>{{ selectedComposition ? 'Edit Composition' : 'New Composition' }}
                <!-- show "Create New Composition" button if editing -->
                <Button 
                    v-if="selectedComposition" 
                    label="New (Exit Editing)"
                    severity="secondary"
                    class="q-mt-md"
                    @click="resetForm"
                />
            </h2>
            <mb-auto-form ref="form"></mb-auto-form>
            <!-- Submit button -->
            <Button
            :label="buttonLabel"
            @click="postComposition"
            raised />
        </div>

        <!-- Right Side: Compositions Section -->
        <div class="compositions-section">
            <h2>Compositions</h2>
            <div v-if="loading">Loading compositions...</div>
            <div v-else-if="error" class="error">{{ error }}</div>
            <div v-else class="grid">
                <div v-for="composition in storedCompositions" :key="composition.uid" class="card" @click="loadComposition(composition.uid)">
                    <p><strong>UID:</strong> {{ composition.uid }}</p>
                    <p><strong>Timestamp:</strong> {{ new Date(composition.timestamp).toLocaleString() }}</p>
                    <Button
                        label="Delete"
                        @click.stop="deleteComposition(composition.uid)"
                        severity="danger"
                        variant="text"
                         />
                    <!-- @click.stop is necessary, so that loadComposition won't be triggered -->
                </div>
            </div>
        </div>
    </div>
    <Toast position="bottom-left"/>
</template>


<style scoped>
/* Use CSS Grid for two equal-width columns */
.vitals-form-container {
    display: grid;
    grid-template-columns: 1fr 1fr; /* Two equal columns */
    width: 100vw;
    height: 100vh;
}

/* Left Side (Form Section) */
.form-section {
    padding: 20px;
    overflow-y: auto; /* Scroll if needed */
    border-right: 2px solid #ddd; /* Separation */
    max-width: 600px;
}

/* Right Side (Compositions Section) */
.compositions-section {
    padding: 20px;
    overflow-y: auto; /* Scroll if needed */
    max-width: 600px;
    background-color: rgb(247, 247, 247)
}

/* Grid Layout for Compositions */
.grid {
    display: grid;
    gap: 15px;
}

/* Card Styling */
.card {
    border: 1px solid #ccc;
    padding: 15px;
    border-radius: 8px;
    max-width: 600px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: white;
    transition: box-shadow 0.3s ease, transform 0.3s ease, background-color 0.3s ease;
    cursor: pointer; /* Add cursor pointer to indicate clickable */
}

.card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card:active {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(2px);
    background-color: #f0f0f0; /* Slight grey background while clicking */
}

/* Error Message Styling */
.error {
    color: red;
    font-weight: bold;
}

/* Responsive Fix */
@media (max-width: 768px) {
    .vitals-form-container {
        grid-template-columns: 1fr; /* Stack on smaller screens */
    }

    .form-section {
        border-right: none; /* Remove separator */
    }
}
</style>
