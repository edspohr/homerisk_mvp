# Guía de Despliegue de HomeRisk MVP

Esta guía detalla los pasos exactos para desplegar HomeRisk MVP en Google Cloud Platform (GCP) utilizando Firebase.

**Importante:** Asegúrate de que el código compila correctamente antes de intentar desplegar.

---

## 1. Configuración Inicial

Asegúrate de tener instaladas las herramientas:

- `node` (versión 18 o superior)
- `firebase-tools` (`npm install -g firebase-tools`)

Inicia sesión en Firebase:

```bash
firebase login
```

---

## 2. Despliegue del Backend (Cloud Functions)

Las "Cloud Functions" contienen la lógica de servidor (ingesta, worker, API).

1.  **Navega a la carpeta de funciones:**

    ```bash
    cd packages/functions
    ```

2.  **Inicializa la configuración (Solo la primera vez):**
    Si no has vinculado el proyecto aún:

    ```bash
    firebase init functions
    ```

    - Selecciona **"Use an existing project"**.
    - Elige tu proyecto de GCP (ej: `homerisk-dev`).
    - **Language:** TypeScript.
    - **ESLint:** No (ya tenemos nuestra config).
    - **Overwrite files?** No (importante para no borrar nuestro código).
    - **Install dependencies?** No (ya las tenemos).

3.  **Compila el código:**
    Es crucial compilar antes de subir, ya que Firebase sube la carpeta `lib` (JS compilado), no los `.ts`.

    ```bash
    npm run build
    ```

    _Si ves errores aquí, el despliegue fallará. Corrige los errores de TypeScript primero._

4.  **Sube las funciones:**
    ```bash
    firebase deploy --only functions
    ```
    _Esto puede tardar unos minutos. Verás en la consola que se crean las funciones: `ingest`, `read`, `worker`._

---

## 3. Despliegue del Frontend (Aplicación Web)

1.  **Navega a la carpeta del frontend:**

    ```bash
    cd ../frontend
    # (Estás en packages/frontend)
    ```

2.  **Configura las Variables de Entorno de Producción:**
    Asegúrate de que tu archivo `.env.production` (o `.env.local` si usas ese) tenga la URL correcta de tu API Gateway o de la Cloud Function de ingestión.

    _Ejemplo .env:_

    ```
    VITE_API_BASE_URL=https://us-central1-TU-PROYECTO.cloudfunctions.net
    VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_maps
    ```

3.  **Compila el Frontend:**
    Esto genera los archivos estáticos optimizados en `dist/`.

    ```bash
    npm run build
    ```

4.  **Inicializa Hosting (Solo la primera vez):**

    ```bash
    firebase init hosting
    ```

    - **Public directory:** `dist` (¡Importante! Vite genera `dist`, no `public`).
    - **Configure as a single-page app?** Yes.
    - **Set up automatic builds and deploys with GitHub?** No (por ahora).
    - **Overwrite index.html?** No.

5.  **Sube el hosting:**
    ```bash
    firebase deploy --only hosting
    ```

---

## 4. Configuración del API Gateway (Opcional)

Si usas Google API Gateway para proteger tus funciones:

1.  **Sube la configuración de la API:**

    ```bash
    gcloud api-gateway api-configs create config-v1 \
      --api=homerisk-api --openapi-spec=../../openapi2-functions.yaml \
      --project=TU_PROYECTO_ID --backend-auth-service-account=TU_SERVICE_ACCOUNT
    ```

2.  **Actualiza el Gateway:**
    ```bash
    gcloud api-gateway gateways update homerisk-gateway \
      --api=homerisk-api --api-config=config-v1 \
      --location=us-central1 --project=TU_PROYECTO_ID
    ```

---

## 5. Solución de Problemas Comunes

- **Error: "Error: No such object: .../types"**:
  Esto suele pasar si el paquete `common` no se ha subido o enlazado bien. Asegúrate de que en `packages/functions/package.json`, la dependencia `@homerisk/common` apunta correctamente (o usa `npm workspace` si despliegas todo junto, pero Firebase suele requerir empaquetado).
  _Solución rápida:_ Asegúrate de ejecutar `npm run build` en `packages/common` antes de construir las funciones.

- **Error de CORS en el Frontend**:
  Verifica que las Cloud Functions tengan habilitado CORS (`cors({ origin: true })`) y que estés llamando a la URL correcta (https/http).

- **El worker no procesa**:
  Revisa los logs en la consola de GCP (Cloud Run Functions -> Logs). Puede que falten las API Keys de SerpApi o Vertex AI en las "Variables de Entorno" de la función (se configuran en la consola de GCP o en `firebase-functions` secrets).

---

## 6. Obtención y Configuración de API Keys (Para Producción Real)

Para que la aplicación funcione con datos reales y no en "Modo Demo", necesitas configurar las siguientes llaves:

### A. Google Maps API Key (Frontend)

Necesaria para el autocompletado de direcciones y mapas.

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Selecciona tu proyecto (`homerisk-fb567`).
3.  Ve a **APIs & Services > Credentials**.
4.  Haz clic en **Create Credentials > API Key**.
5.  (Recomendado) Restringe la llave para uso web (`HTTP Referrers`) y añade tu dominio: `homerisk-fb567.web.app`.
6.  Habilita las siguientes APIs en **Library**:
    - Places API (New) o Places API (Legacy).
    - Maps JavaScript API.
7.  **Dónde ponerla:**
    - En tu máquina local, edita `packages/frontend/.env` (o crea `.env.production`).
    - Añade: `VITE_GOOGLE_MAPS_API_KEY=tu_llave_aqui`
    - Ejecuta `npm run build` y `firebase deploy --only hosting`.

### B. SerpApi Key (Backend - Worker)

Necesaria para buscar noticias y datos de delincuencia en tiempo real en Google.

1.  Regístrate en [SerpApi.com](https://serpapi.com/).
2.  Obtén tu **Private API Key** del dashboard.
3.  **Dónde ponerla:**
    - Opción 1 (Consola): Ve a Google Cloud Console -> Cloud Run Functions -> selecciona `worker` -> Edit -> Runtime variables -> Add Variable.
      - Name: `SERPAPI_KEY`
      - Value: `tu_llave_serpapi`
    - Opción 2 (CLI):
      ```bash
      firebase functions:config:set services.serpapi_key="tu_llave"
      # Nota: Requiere actualizar el código para usar functions.config() o usar secrets
      ```
    - **Recomendado hoy:** Configúrala directo en la consola de GCP para la función `worker`.

### C. Vertex AI (Backend - Worker)

Ya debería estar activo si habilitaste las APIs de GCP, pero confirma:

1.  En Google Cloud Console, busca "Vertex AI API".
2.  Asegúrate de que esté **Enable**.
3.  La función usa las credenciales por defecto del proyecto, no requiere Key extra, solo permisos (que ya tiene por defecto en Firebase Functions).
