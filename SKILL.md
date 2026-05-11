# Contractor Multipages — Template Skill

> **Propósito**: Template reutilizable para crear sitios web de contratistas (masonry, roofing, landscaping, tree services, etc.) usando Astro + Tailwind CSS + Alpine.js.

---

## Stack

| Tecnología | Uso |
|---|---|
| Astro 6 | SSG estático |
| Tailwind CSS 3 | Estilos mobile-first |
| Alpine.js 3 | Interactividad ligera |
| Swiper.js 12 | Sliders y carruseles |
| Font Awesome 6 | Iconos |
| Sharp | Optimización de imágenes |

## Estructura Rápida

```
src/
├── components/
│   ├── layout/      # TopBar, Header, NavMenu, Footer, MobileStickyBar
│   └── sections/    # HeroSlider, CTABar, Welcome, Services, Testimonials, Gallery, About, etc.
├── data/            # content.json, blogs.json, landings.json
├── layouts/         # BaseLayout, LandingLayout
├── pages/           # index, about-us, services, gallery, blog/*, contact-us, etc.
├── styles/          # global.css
└── utils/           # navigation.ts (menú dinámico)
```

## Cómo usar

1. Clonar este repo
2. `npm install --legacy-peer-deps`
3. Editar `src/data/content.json` con datos del cliente
4. Editar `src/data/blogs.json` si hay blog
5. Editar `src/data/landings.json` para landing pages
6. Personalizar colores en `tailwind.config.mjs` (primary/accent/dark)
7. Agregar logo en `public/logo.png`
8. Reemplazar imágenes Unsplash por fotos del cliente
9. `npm run dev` para desarrollo
10. `npm run build` para producción

## Personalización por Rubro

```js
// Colores sugeridos en tailwind.config.mjs
colors: {
  primary: '#003060',  // Cambiar según rubro
  accent: '#962e20',   // Cambiar según rubro
  dark: '#012141',
}

// Rubros comunes:
// Roofing:  primary:#1a3a4a  accent:#c45a2c
// Landscaping: primary:#2d5a27  accent:#8b6f47
// Tree svc: primary:#3d5a35  accent:#8b4513
// Painting: primary:#2c3e50  accent:#e67e22
```

## Archivos JSON (datos)

- `src/data/content.json` → TODO el contenido del sitio
- `src/data/blogs.json` → Posts del blog
- `src/data/landings.json` → Landing pages

Ver cada JSON para estructura de campos.

## Deployment

```bash
npm run build
# Subir dist/ a Netlify, Vercel, o cualquier hosting estático
```

Ver `SKILL.md` completo para documentación detallada.
