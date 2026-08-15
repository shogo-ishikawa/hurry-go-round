# Hurry-Go-Round Art Direction

## Identity

A warm, welcoming, lightly whimsical daytime farm shown in a top-down three-quarter perspective. Forms are clean and vector-like, with rounded silhouettes, legible details, restrained texture, and no pixel-art or photorealistic treatment.

## Palette

`src/game/art/palette.ts` is the single color source for game rendering. Roles include warm green grass, deep foliage, ochre paths, brown soil, golden wheat, cream UI, terracotta barn walls, teal workwear and interaction accents, warm brown outlines, soft blue water, and sunlight highlights. New visual modules must extend this shared palette rather than introduce isolated colors.

## Drawing rules

- **Outlines:** warm dark brown, normally 2–7 world units depending on object scale; avoid pure black.
- **Shadows:** soft, low-opacity shapes offset down and right, suggesting sunlight from the upper left.
- **Highlights:** small, warm, and placed toward upper-left surfaces.
- **Character:** approximately 84 world units tall, compact and rounded, with an oversized readable hat/head and sturdy workwear silhouette.
- **Environment:** trees are roughly character-height or taller; buildings are several character widths; crops remain individually readable at minimum camera zoom.
- **Depth:** bottom-edge or world-y depth sorting lets the farmer pass naturally around foliage and crops.

## Naming and source assets

Use semantic PascalCase names for entity classes and lower camel case for drawing helpers. Future reusable SVG files should use lowercase kebab-case names grouped by subject and state, such as `farmer-front-idle.svg` or `wheat-growing.svg`. SVG source must stay formatted, labeled where useful, and maintainable rather than minified.

## Animation

Motion should be short, soft, and purposeful: gentle idle breathing, modest walk bob, asynchronous crop sway, quick harvest squash, rising feedback, and arcing delivery cues. Avoid continuous high-amplitude motion or unbounded effects. Temporary objects must have strict lifetimes.

## Future replacement conventions

Rendering and gameplay state remain separate. Replacement art should preserve each entity container’s bottom-center alignment, approximate dimensions, direction contract, and visual state names. Vite imports or local public assets are required; remote URLs, CDNs, external fonts, and copied third-party assets are not permitted.

## Market additions

Market structures reuse ochre wood, cream cloth, terracotta stripes, golden wheat, and teal interaction rings. Customers share the farmer's rounded proportions while four palette-driven clothing, hair, hat, and bag combinations keep the queue readable. Coins use warm gold with ochre outlines; empty shelf trays and queue rings remain visible at low opacity so capacity and flow stay legible.

## Automation additions

The harvest worker uses olive headwear and warm work clothes; the transport worker uses blue workwear and a readable two-wheel carrier. Their silhouettes, cargo, and Japanese status plaques remain distinct from the teal-overall farmer. The collection crate uses sixteen small physical shelf positions, and hiring/pickup rings appear only on interactive areas. Worker routes follow authored farm waypoints rather than general pathfinding.

## v0.5.0 expansion and livestock

- Corn is taller than wheat, with deep-green stalks and leaves, bright yellow ears, and clearly shorter harvested/growing silhouettes.
- The three chickens use rounded cream, light-brown, and brown bodies, small outlined legs, combs, beaks, soft shadows, and restrained walking bob.
- The south parcel uses warm timber, terracotta coop walls, straw-colored ground, a dark doorway, trough, egg crate, fence, and water fixture.
- Resource cargo stays readable at 12, 18, and 24 capacity: wheat bundles, yellow/green corn, and cream eggs in compact crate rows are visually distinct.
- Facility copy belongs to reusable timber signs, mounted plates, bubbles, or camera-fixed panels. Interaction floors use rings and pictograms only; ordinary scenery never receives an interaction circle.
- Locked parcels use muted ground, timber gates and a drawn lock. Unlocking removes the gate rather than leaving a debug boundary visible.
