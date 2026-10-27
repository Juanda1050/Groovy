# Groovy

Una aplicación para descubrir música, organizar tu biblioteca y compartir lo que escuchas.

Groovy permite guardar álbumes, valorarlos, escribir reseñas y explorar la actividad de otros usuarios.

[Visitar Groovy](https://usegroovy.online)

## Funcionalidades

### Descubrimiento y biblioteca

- Búsqueda de álbumes mediante Spotify.
- Información del álbum y listado de canciones.
- Biblioteca con estados pendiente y escuchado.
- Valoraciones de 1 a 5 estrellas, con medias estrellas.
- Reseñas opcionales de hasta 144 caracteres.
- Canciones favoritas y menos favoritas.
- Filtros y paginación de 10 registros.
- Conservación de filtros y página al navegar desde la biblioteca hacia un álbum y regresar.

### Comunidad

- Publicaciones generadas a partir de los álbumes escuchados.
- Feeds de Comunidad y Siguiendo.
- Reacciones y consulta de las personas que dieron like.
- Comentarios con edición y eliminación de comentarios propios.
- Confirmaciones para acciones destructivas.
- Perfiles públicos y seguimiento de usuarios.
- Búsqueda por nombre o username.

### Cuenta y personalización

- Registro e inicio de sesión.
- Acceso con correo electrónico o username.
- Onboarding para completar el perfil.
- Validación de disponibilidad del username.
- Avatar, nombre y biografía.
- Temas claro y oscuro.
- Paletas de colores.
- Interfaz en español e inglés.
- Diseño adaptable a dispositivos móviles.

## Stack

| Área | Tecnologías |
| --- | --- |
| Interfaz | React, TypeScript y Vite |
| Estilos | Tailwind CSS |
| Componentes | Base UI y componentes de estilo shadcn |
| Navegación | React Router |
| Datos y caché | TanStack Query |
| Estado | Zustand |
| Validación | Zod |
| Internacionalización | i18next |
| Backend | Supabase Auth, PostgreSQL, Storage y Realtime |
| Funciones | Supabase Edge Functions con Deno |
| Catálogo musical | Spotify Web API |
| Hosting | Vercel |

## Requisitos

- Node.js 22.12 o superior.
- npm.
- Git.
- Un proyecto Supabase con el esquema, las funciones SQL y las políticas requeridas por Groovy.
- Una aplicación de Spotify Developer con Client ID y Client Secret.
- Una cuenta de Vercel para publicar el frontend.

Deno es opcional para comprobar las Edge Functions localmente. Docker es necesario si se utiliza el entorno local completo de Supabase.

> Los tipos de TypeScript no crean las tablas, funciones SQL ni políticas de seguridad. Un proyecto Supabase nuevo necesita primero el esquema de la aplicación.

## Estructura

```text
groovy/
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── queryClient.ts
│   │   └── router.tsx
│   ├── features/
│   │   ├── auth/
│   │   ├── catalog/
│   │   ├── community/
│   │   ├── library/
│   │   ├── preferences/
│   │   └── profile/
│   ├── locales/
│   │   ├── en/
│   │   └── es/
│   ├── models/
│   │   └── database.ts
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   ├── spotify/
│   │   ├── usernameAvailability/
│   │   └── usernameLogin/
│   └── config.toml
├── index.html
├── package.json
├── vercel.json
└── vite.config.ts
```

Cada funcionalidad agrupa sus componentes, hooks, servicios y utilidades. Los elementos reutilizables se encuentran en `shared` y los tipos de la aplicación en `models`.

## Instalación

Clona el repositorio y entra en el proyecto:

```bash
git clone <URL_DEL_REPOSITORIO>
cd groovy
npm ci
```

Los comandos siguientes se ejecutan desde la raíz del proyecto.

## Variables de entorno

### Frontend

Crea un archivo `.env`:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA_DE_SUPABASE
VITE_DEV_AUTH_BYPASS=false
```

La variable `VITE_AUTH_PUBLIC_KEY` se agrega al generar las claves de cifrado, como se explica más adelante.

| Variable | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública de acceso a Supabase |
| `VITE_AUTH_PUBLIC_KEY` | Clave pública RSA para cifrar las credenciales |
| `VITE_DEV_AUTH_BYPASS` | Omisión de autenticación exclusiva del entorno local de desarrollo |

Mantén `VITE_DEV_AUTH_BYPASS=false` para probar el flujo real de autenticación.

### Edge Functions

Crea `supabase/.env.spotify`:

```dotenv
SPOTIFY_CLIENT_ID=TU_SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=TU_SPOTIFY_CLIENT_SECRET
SPOTIFY_MARKET=MX
APP_ORIGINS=http://localhost:5173,https://usegroovy.online,https://www.usegroovy.online
```

La variable `AUTH_PRIVATE_KEY` se agrega al generar las claves.

| Variable | Uso |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | Identificador de la aplicación de Spotify |
| `SPOTIFY_CLIENT_SECRET` | Secreto de la aplicación de Spotify |
| `SPOTIFY_MARKET` | Mercado utilizado para consultar el catálogo |
| `APP_ORIGINS` | Orígenes permitidos por las Edge Functions, separados por comas |
| `AUTH_PRIVATE_KEY` | Clave privada RSA para descifrar las credenciales |

`APP_ORIGINS` utiliza coincidencias exactas. Incluye protocolo y puerto cuando corresponda, sin rutas ni `/` final. No admite comodines en la implementación actual.

Las Edge Functions alojadas disponen de las variables integradas `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

> No publiques archivos `.env`. Las variables con prefijo `VITE_` son visibles en el navegador. La clave privada RSA, el secreto de Spotify y la clave de servicio de Supabase deben permanecer en el backend.

## Claves de cifrado de autenticación

El login y el registro utilizan AES-GCM para cifrar las credenciales y RSA-OAEP para proteger la clave de cada petición.

Genera el par de claves una sola vez:

```bash
node --input-type=module <<'JS'
import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";

const publicFile = ".env";
const privateFile = "supabase/.env.spotify";

function containsKey(file, key) {
  return existsSync(file) && readFileSync(file, "utf8")
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(`${key}=`));
}

if (
  containsKey(publicFile, "VITE_AUTH_PUBLIC_KEY") ||
  containsKey(privateFile, "AUTH_PRIVATE_KEY")
) {
  throw new Error("Ya existen claves. No se sobrescribieron.");
}

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 3072,
  publicKeyEncoding: {
    type: "spki",
    format: "der",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "der",
  },
});

function appendVariable(file, key, value) {
  const previous = existsSync(file) ? readFileSync(file, "utf8") : "";
  const separator = previous && !previous.endsWith("\n") ? "\n" : "";

  writeFileSync(file, `${previous}${separator}${key}=${value}\n`);
  chmodSync(file, 0o600);
}

const publicValue = publicKey.toString("base64");

appendVariable(publicFile, "VITE_AUTH_PUBLIC_KEY", publicValue);
appendVariable(privateFile, "AUTH_PRIVATE_KEY", privateKey.toString("base64"));

console.log("Variable pública para Vercel:");
console.log(`VITE_AUTH_PUBLIC_KEY=${publicValue}`);
JS
```

El comando conserva las variables existentes y solo imprime la clave pública.

- `.env` recibe `VITE_AUTH_PUBLIC_KEY`.
- `supabase/.env.spotify` recibe `AUTH_PRIVATE_KEY`.
- En Vercel se configura únicamente la clave pública.
- La clave privada se sube mediante los secretos de Supabase.

No regeneres las claves en cada despliegue. Una rotación requiere actualizar tanto la clave privada del backend como la pública del frontend.

Este cifrado añade una capa al cuerpo de la petición, pero no sustituye HTTPS ni impide inspeccionar las credenciales antes de cifrarlas desde el propio navegador.

## Configurar Supabase

### Iniciar sesión en la CLI

```bash
npx supabase login
```

### Vincular el proyecto remoto

```bash
npx supabase link --project-ref project_ref
```

Reemplaza `project_ref` por la referencia del proyecto Supabase. No es el nombre visible del proyecto ni el dominio de la aplicación.

### Subir secretos

```bash
npx supabase secrets set --env-file supabase/.env.spotify
```

Este comando actualiza los secretos del proyecto vinculado. No despliega el código de las funciones.

Para comprobar los nombres de los secretos configurados:

```bash
npx supabase secrets list
```

### Configurar autenticación

En el dashboard de Supabase, entra a:

**Authentication → URL Configuration**

Configura:

- **Site URL:** la dirección principal de producción.
- **Redirect URLs:** las direcciones permitidas para los flujos de autenticación, incluyendo desarrollo local cuando corresponda.

La configuración de Auth y `APP_ORIGINS` son independientes. Autorizar una URL en Auth no la agrega automáticamente a los orígenes de las Edge Functions.

### Desplegar las Edge Functions

```bash
npx supabase functions deploy spotify --no-verify-jwt
```

```bash
npx supabase functions deploy usernameLogin --no-verify-jwt
```

```bash
npx supabase functions deploy usernameAvailability --no-verify-jwt
```

| Función | Responsabilidad |
| --- | --- |
| `spotify` | Búsqueda, detalle, canciones y guardado de álbumes |
| `usernameLogin` | Login por correo o username y registro mediante credenciales cifradas |
| `usernameAvailability` | Comprobar la disponibilidad de un username |

El flag `--no-verify-jwt` omite la comprobación automática del gateway:

- `spotify` verifica internamente la identidad y autorización del usuario.
- `usernameAvailability` valida el token con Supabase Auth.
- `usernameLogin` recibe solicitudes previas al inicio de sesión y aplica validación de credenciales cifradas y límites de intentos.

No utilices este flag en otras funciones sin revisar su autenticación.

### Generar tipos de TypeScript

Después de cambiar el esquema o las funciones SQL:

```bash
npx supabase gen types typescript \
  --project-id project_ref \
  --schema public \
  > src/models/database.ts
```

El comando necesita los prefijos `--` en sus opciones y `>` para escribir la salida en el archivo.

Comprueba que termine correctamente. El operador `>` sobrescribe el archivo de destino.

La función de Spotify también utiliza una copia de los tipos del esquema. Para sincronizarla con el archivo generado:

```bash
cp src/models/database.ts supabase/functions/spotify/models/database.ts
```

No edites manualmente estos archivos generados. Actualiza primero la base de datos y vuelve a generarlos.

## Desarrollo local

Con las variables configuradas y las Edge Functions disponibles:

```bash
npm run dev -- --port 5173 --strictPort
```

Abre:

```text
http://localhost:5173
```

Si utilizas otro puerto, actualiza también `APP_ORIGINS` y las URL de autenticación que correspondan.

Reinicia Vite después de modificar las variables del frontend.

### Entorno local completo de Supabase

Requiere Docker y el esquema de la aplicación disponible en el entorno local:

```bash
npx supabase start
```

Para consultar el estado:

```bash
npx supabase status
```

Para servir una función localmente:

```bash
npx supabase functions serve spotify \
  --env-file supabase/.env.spotify \
  --no-verify-jwt
```

Al utilizar Supabase local, configura en el frontend la URL y la clave pública locales.

Para detener los servicios:

```bash
npx supabase stop
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm ci` | Instala las dependencias del lockfile |
| `npm run dev` | Inicia Vite en desarrollo |
| `npm run lint` | Ejecuta ESLint |
| `npm run build` | Comprueba TypeScript y genera `dist` |
| `npm run preview` | Sirve localmente la compilación de producción |

Para comprobar el frontend antes de publicar:

```bash
npm run lint
npm run build
```

Para revisar las funciones con Deno:

```bash
deno check --config supabase/functions/spotify/deno.json \
  supabase/functions/spotify/index.ts
```

```bash
deno check --config supabase/functions/usernameLogin/deno.json \
  supabase/functions/usernameLogin/index.ts
```

```bash
deno check --config supabase/functions/usernameAvailability/deno.json \
  supabase/functions/usernameAvailability/index.ts
```

Estas comprobaciones no sustituyen las pruebas de autenticación, permisos y comportamiento en navegador contra el proyecto Supabase.

## Despliegue en Vercel

Conecta el repositorio y configura `production` como rama de producción.

| Ajuste | Valor |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | Raíz del proyecto |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Configura estas variables para el entorno Production:

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA_DE_SUPABASE
VITE_AUTH_PUBLIC_KEY=TU_CLAVE_PUBLICA_RSA_EN_BASE64
VITE_DEV_AUTH_BYPASS=false
```

`VITE_AUTH_PUBLIC_KEY` es pública y puede configurarse como **Config** en Vercel.

Después de cambiar una variable del frontend, genera un nuevo despliegue.

### Rutas de React Router

El archivo `vercel.json` debe estar en la raíz:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Esta regla permite abrir y recargar directamente rutas como `/auth`, `/library`, `/community` y `/profile`.

### Dominio personalizado

1. Agrega el dominio en **Vercel → Settings → Domains**.
2. Configura en tu proveedor DNS los registros indicados por Vercel.
3. Agrega el dominio exacto a `APP_ORIGINS`.
4. Sube los secretos actualizados a Supabase.
5. Actualiza Site URL y las Redirect URLs de Supabase Auth.

Incluye por separado las variantes con y sin `www` si ambas se utilizan.

## Flujo de publicación

### Cambios únicamente del frontend

1. Ejecutar lint y build.
2. Revisar los cambios.
3. Incorporarlos a `production`.
4. Subir la rama y comprobar el despliegue de Vercel.

### Cambios en Edge Functions

1. Comprobar la función.
2. Actualizar secretos si es necesario.
3. Desplegar la función modificada.
4. Publicar el frontend cuando el cambio también lo requiera.

### Cambios en la base de datos

1. Aplicar los cambios SQL al proyecto correspondiente.
2. Regenerar los tipos de TypeScript.
3. Sincronizar los tipos utilizados por Spotify.
4. Comprobar y desplegar el código afectado.

La rama de Git no crea un entorno Supabase independiente. Si desarrollo y producción usan las mismas credenciales, comparten usuarios y datos.

## Solución de problemas

| Problema | Revisar |
| --- | --- |
| 404 al recargar una ruta | `vercel.json` en la raíz y último despliegue |
| 403 en una Edge Function | `APP_ORIGINS`, protocolo, puerto y variante `www` |
| Cambios locales de secretos sin efecto | Ejecutar `npx supabase secrets set --env-file supabase/.env.spotify` |
| Cambios de variables en Vercel sin efecto | Generar un nuevo despliegue |
| Login cifrado devuelve error | Correspondencia entre la clave pública y la privada, configuración y reloj del dispositivo |
| 429 al consultar Spotify | Respetar el tiempo de espera indicado por el servicio |
| Álbumes sin información en listados | Función `spotify` actualizada y recuperación de metadatos disponible |
| Errores de tipos después de cambiar SQL | Regenerar `database.ts` desde el proyecto correcto |

Para investigar un fallo, revisa Network en el navegador y los logs de la función correspondiente en Supabase. No registres contraseñas, claves privadas ni tokens.

## Convenciones de desarrollo

- Mantener TypeScript estricto.
- Reutilizar componentes, modelos y servicios existentes.
- Mantener cada componente de interfaz en su propio archivo.
- Usar camelCase en nuevos nombres de archivos y carpetas, sin guiones.
- Colocar los textos de interfaz en los JSON de español e inglés.
- Separar los datos de caché por usuario.
- Conservar las comprobaciones de autoría y permisos en el backend.
- No editar manualmente los tipos generados de Supabase.
- Mantener los secretos fuera del repositorio.
- Distinguir las comprobaciones locales de las pruebas reales en Supabase y navegador.

## Referencias

- [Supabase CLI](https://supabase.com/docs/reference/cli)
- [Generación de tipos](https://supabase.com/docs/guides/api/rest/generating-types)
- [Secretos de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
- [Configuración de Edge Functions](https://supabase.com/docs/guides/functions/function-configuration)
- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)