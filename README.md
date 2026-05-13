# Silva Ortiz Abogados — Sistema de Gestión Legal

Next.js 14 · TypeScript · Tailwind CSS · NextAuth v4 (Azure AD)

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Auth | NextAuth.js v4 · AzureADProvider |
| UI | Tailwind CSS v3 · Lucide React |
| Lenguaje | TypeScript (strict) |
| Deploy | Vercel |

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Redirige a `/expedientes` |
| `/auth/login` | Login con Microsoft |
| `/expedientes` | Tabla de causas, KPIs, vencimientos |
| `/audiencias` | Agenda de audiencias + mini-calendario |
| `/clientes` | Grilla de clientes |

---

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd silva-ortiz-app
npm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completar `.env.local`:

```env
NEXTAUTH_SECRET=<string aleatorio largo>
NEXTAUTH_URL=http://localhost:3000

AZURE_AD_CLIENT_ID=<application-id>
AZURE_AD_CLIENT_SECRET=<client-secret-value>
AZURE_AD_TENANT_ID=<tenant-id / directory-id>
```

### 3. Correr

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Configurar Azure Active Directory (Microsoft Entra ID)

### Paso 1 — Registrar la aplicación

1. Ir a [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Nombre: `Silva Ortiz App` (o el que quieras).
3. Supported account types: **Accounts in this organizational directory only** (Single tenant).
4. Redirect URI: **Web** → `http://localhost:3000/api/auth/callback/azure-ad`.
5. Click **Register**.

### Paso 2 — Obtener credenciales

En la página de la aplicación:

- **Application (client) ID** → `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`

### Paso 3 — Crear un Client Secret

1. **Certificates & secrets** → **New client secret**.
2. Descripción: `nextauth` · Expires: 24 months.
3. Copiar el **Value** (solo se muestra una vez) → `AZURE_AD_CLIENT_SECRET`.

### Paso 4 — Permisos de API

En **API permissions**, verificar que estén presentes:

| Permission | Type |
|-----------|------|
| `openid` | Delegated |
| `profile` | Delegated |
| `email` | Delegated |
| `offline_access` | Delegated |
| `User.Read` | Delegated |

Si no están, agregar **Microsoft Graph** → Delegated → seleccionar las anteriores → **Grant admin consent**.

### Paso 5 — Redirect URI adicional para producción

En **Authentication** → **Redirect URIs**, agregar:

```
https://<tu-app>.vercel.app/api/auth/callback/azure-ad
```

---

## Deploy en Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <tu-repo>
git push -u origin main
```

### 2. Importar en Vercel

1. [vercel.com/new](https://vercel.com/new) → importar el repositorio.
2. Framework preset: **Next.js** (auto-detectado).
3. En **Environment Variables**, agregar:

| Key | Value |
|-----|-------|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://<tu-app>.vercel.app` |
| `AZURE_AD_CLIENT_ID` | el de Azure |
| `AZURE_AD_CLIENT_SECRET` | el de Azure |
| `AZURE_AD_TENANT_ID` | el de Azure |

4. Click **Deploy**.

### 3. Actualizar Redirect URI en Azure

Agregar en **Authentication** → **Redirect URIs**:

```
https://<tu-app>.vercel.app/api/auth/callback/azure-ad
```

---

## Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## Estructura del proyecto

```
silva-ortiz-app/
├── app/
│   ├── (dashboard)/          # Rutas protegidas
│   │   ├── layout.tsx        # Layout con Header + protección de sesión
│   │   ├── expedientes/
│   │   ├── audiencias/
│   │   └── clientes/
│   ├── api/auth/[...nextauth]/
│   ├── auth/login/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── auth/
│   ├── audiencias/
│   ├── clientes/
│   ├── expedientes/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── auth.ts               # NextAuth options
│   ├── data.ts               # Datos mock (reemplazar con API/DB)
│   └── utils.ts
├── types/
│   ├── index.ts
│   └── next-auth.d.ts
└── middleware.ts             # Protege /expedientes, /audiencias, /clientes
```

## Conectar a base de datos real

Los datos de demostración están en `lib/data.ts`. Para conectar la BD SQL Server del estudio:

1. Instalar `mssql` o `@prisma/client`.
2. Crear un cliente de DB en `lib/db.ts`.
3. Reemplazar las importaciones de `lib/data.ts` en los Server Components por llamadas a la DB.
4. Los tipos en `types/index.ts` ya están alineados con el esquema DSO.
