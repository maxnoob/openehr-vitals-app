# Task 1 - Vitals (openEHR Bootcamp)

## Features
- **Create a Composition** by entering values in the form and clicking the **"Save Values"** button.  
  - This sends a **POST** request in the `postComposition` function.
- **View Created Compositions** as cards listed on the right.  
  - This is done by sending a **POST** request in the `listCompositions` function, which executes an **AQL query** to fetch compositions.
- **Delete a Composition** by clicking the delete button.  
  - This sends a **DELETE** request to the server.
- **Edit a Composition** by clicking a listed composition.  
  - The values are retrieved via a **GET** request in the `loadComposition` function and populate the form.  
  - The **"Save Values"** button dynamically changes to **"Update Values"**.  
  - Editing can be **canceled** by clicking **"New"** next to the form title.

### Backend Configuration
- By default, the application communicates with the **Medblocks EHRBase server**.
- You can also run **EHRBase locally using Docker**.

---

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

