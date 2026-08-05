# Rich Text Editor Comparison: Radzen HtmlEditor vs Quill 2

**Live demo (Blazor WebAssembly on GitHub Pages): <https://maureranton.github.io/radzen-vs-quill-editor-comparison/>**

A small .NET 8 Blazor (WebAssembly) application that renders two rich text editors side by side on a single page:

- **Radzen HtmlEditor** (from the MIT-licensed [Radzen.Blazor](https://github.com/radzenhq/radzen-blazor) library)
- **Quill 2** (snow theme, BSD-3-Clause, vendored locally under `wwwroot/quill/`)

The page exposes a "Sample link" button on both editors, live HTML previews, and a copy-between-editors workflow. It was built to demonstrate (and verify) a known browser-level defect in Radzen HtmlEditor: when a selection includes the end of a paragraph, inserting a hyperlink can cause the **next line to inherit the link** when you press Enter. Quill does not exhibit this behavior.

## How to reproduce the link defect

1. Open the page at `/compare`.
2. At the end of the first paragraph, select the text all the way to the end of the line/paragraph (include the line break in the selection).
3. Click "Insert link" in the Radzen toolbar and enter a URL.
4. Press Enter and type on the new line.
5. In Radzen the new line may inherit the link (undo with Ctrl+Z); in Quill it will not.

## Requirements

- [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) or later

The app pins `Radzen.Blazor` 11.2.2 via NuGet. Quill and the small JS bridge (`wwwroot/quill/quillModule.js`) are checked in, so no npm step is required.

## Run locally (development)

```bash
dotnet restore
dotnet run --urls http://localhost:5080
```

Then open <http://localhost:5080/compare>.

> Note: if you change `.razor` files, stop the server (`Ctrl+C`) and run `dotnet build` before restarting with `dotnet run --no-build` to avoid serving stale assemblies.

## Deploy to production

### Option A: Publish and host with Kestrel (any Linux/Windows box)

```bash
dotnet publish -c Release -o publish
./publish/CompareEditors --urls http://0.0.0.0:5080
```

Run it as a service with your init system (systemd, launchd, Windows Service) and put a reverse proxy in front (see below).

### Option B: Reverse proxy (recommended)

Put Nginx or Caddy in front of Kestrel and terminate TLS there. Example Nginx snippet:

```nginx
server {
    listen 80;
    server_name editors.example.com;

    location / {
        proxy_pass http://127.0.0.1:5080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The `Upgrade`/`Connection` headers are required for Blazor Server's WebSocket transport (interactive components).

### Option C: Docker

Build a multi-stage image with the .NET 8 SDK and aspnet runtime images:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "CompareEditors.dll"]
```

Then:

```bash
docker build -t editor-comparison .
docker run -p 8080:8080 editor-comparison
```

### Option D: Container hosting (Fly.io, Render, Railway, etc.)

These platforms accept any Dockerfile; Option C's Dockerfile works as-is. Set the port via `ASPNETCORE_URLS` to whatever the platform provides.

## How it works

- `Components/Pages/Compare.razor` — the page: two editor cards, live HTML preview textareas, "Sample link" and copy buttons, reset button, and a research section comparing the two editors (code size, release dates, community, known complaints).
- `Components/Layout/BlankLayout.razor` — minimal layout without the sidebar (used by the comparison page).
- `<RadzenDialog />` / `<RadzenTooltip />` live inside `Compare.razor`, **not** in the layout. With `@rendermode InteractiveServer`, components placed in a layout render in a static/prerender scope and never subscribe to the interactive circuit's `DialogService` - the editor's link dialog would silently never open. Keep them inside the interactive page (or an interactive layout).
- `wwwroot/quill/quillModule.js` — thin JS bridge exposing `compareQuill.init/getHtml/setHtml/insertSampleLink`; it holds a `DotNetObjectReference` to push changes back to Blazor via `[JSInvokable] OnQuillChange`.
- `Program.cs` — registers Razor Components (Interactive Server) and `AddRadzenComponents()` (required by Radzen HtmlEditor; otherwise it throws `Cannot provide a value for property 'ContextMenuService'`).

## Known issues / notes

- The link-leak defect is in Radzen's own JS (`document.execCommand` without DOM normalization). It cannot be caught by component-level tests (bUnit) because JS interop is mocked; only real-browser E2E can reproduce it. Note: through the dialog flow the leak is not reliably reproducible - Radzen inserts a fully constructed `<a>` via `insertHTML`, which consumes the boundary `<br>`.
- The Radzen theme (`default.css`) is invasive: it globally restyles `.nav`, `.sidebar` and `.card`. The compatibility overrides live in `wwwroot/app.css` under a "Compatibility" section.
- Radzen dialogs require `RadzenDialog` in the interactive component tree - see "How it works" for the render-mode gotcha.

## License

Copyright (C) 2026 the contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

Dependencies:

- [Radzen.Blazor](https://github.com/radzenhq/radzen-blazor) — MIT
- [Quill](https://github.com/slab/quill) — BSD-3-Clause
- Bootstrap 5 — MIT
