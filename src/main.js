import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import Lara from '@primevue/themes/lara';
import Button from "primevue/button";
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';


const app = createApp(App)

app.use(PrimeVue, {
    theme: {
        preset: Lara,
        options: {
            prefix: 'p',
            darkModeSelector: 'false',
            cssLayer: false
        }
    }})
app.use(ToastService);
app.component('Button', Button);
app.component('Toast', Toast);


app.mount('#app')