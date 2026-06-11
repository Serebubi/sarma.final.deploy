# Design System Specification: High-End Delivery Experience

## 1. Overview & Creative North Star: "The Fluid Concierge"
The Creative North Star for this design system is **"The Fluid Concierge."** We are moving away from the rigid, boxy layouts of traditional logistics and moving toward an editorial, high-end lifestyle experience. Delivery is often stressful; this system aims to make it feel effortless, premium, and soft.

To achieve this, we break the "template" look by utilizing **intentional asymmetry**—such as oversized imagery overlapping container boundaries—and **tonal depth**. We replace harsh structural lines with soft transitions of light and color. The goal is a UI that feels like it was "poured" onto the screen rather than built with blocks.

---

## 2. Colors & Surface Philosophy
This system relies on a sophisticated palette of pinks, purples, and slate neutrals. We use Material Design token conventions to manage a complex hierarchy of surfaces.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. You must define boundaries through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides enough contrast to guide the eye without creating a "caged" feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the following tiers to create "nested" importance:
*   **Background (`#f5f6f7`):** The canvas.
*   **Surface-Container-Lowest (`#ffffff`):** Reserved for primary interactive cards and modals.
*   **Surface-Container-Low (`#eff1f2`):** Used for secondary content areas or to group items within a white card.
*   **Surface-Container-High (`#e0e3e4`):** Used for navigation bars or subtle "wells" for input fields.

### The "Glass & Gradient" Rule
To elevate the "Modern Startup" feel, floating elements (like a sticky "Track Order" bar) should utilize **Glassmorphism**. Use `surface-container-lowest` at 70% opacity with a `24px` backdrop-blur. 

**Signature Texture:** Main CTAs and Hero backgrounds must use a linear gradient from `primary` (#a8216e) to `secondary` (#811cd9) at a 135-degree angle. This provides a visual "soul" that flat colors lack.

---

## 3. Typography
We pair **Plus Jakarta Sans** (Display/Headline) with **Inter** (Body) to balance high-end personality with functional readability.

*   **Display Scale (Plus Jakarta Sans):** Use for hero messaging and large numbers (e.g., "Arriving in 15 mins"). These should feel authoritative yet friendly.
*   **Headline Scale (Plus Jakarta Sans):** Used to introduce new sections. Use `headline-lg` (2rem) to create a clear entry point.
*   **Body Scale (Inter):** Used for all transactional information. `body-md` (0.875rem) is our workhorse for descriptions.
*   **Label Scale (Inter):** Used for metadata (e.g., delivery fees, timestamps). High-contrast `on-surface-variant` ensures these are readable but secondary.

**Editorial Tip:** Use "tight" tracking (-2%) on Display titles to give them a premium, "custom-lettered" feel.

---

## 4. Elevation & Depth
Depth is a first-class citizen in this system, conveyed through **Tonal Layering** rather than structural geometry.

*   **The Layering Principle:** Stack `surface-container-lowest` cards on a `surface-container-low` background. This creates a soft, natural lift without the "heaviness" of a shadow.
*   **Ambient Shadows:** When a card needs to "float" (e.g., a hovered state), use a shadow with a blur of `40px` and an opacity of `6%`. The shadow color should be tinted with `secondary` (purple) to mimic the way light interacts with the brand colors.
*   **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in high-contrast modes), use the `outline-variant` token at **15% opacity**. Never use a 100% opaque border.
*   **Roundedness Scale:** Embrace the "Super-Soft" aesthetic.
    *   **Default:** `1rem` (Buttons, small cards)
    *   **LG/XL:** `2rem` to `3rem` (Major sections, Hero containers, Search bars)

---

## 5. Components

### Buttons
*   **Primary:** High-conversion. Use the `primary-to-secondary` gradient. Large padding (`spacing-4` horizontal). Corner radius: `full`.
*   **Secondary:** Glass-style. `surface-container-highest` background with `on-surface` text.
*   **Tertiary:** No background. `primary` text color. Use for "Cancel" or "View All."

### Cards & Lists
**Forbid the use of divider lines.** Use `spacing-4` (1.4rem) of vertical white space to separate list items. For complex lists, use a alternating background shift (`surface` to `surface-container-low`) for every other row.

### Input Fields
*   **Base:** `surface-container-highest` background. No border.
*   **Focus State:** A 2px "glow" using the `primary` color at 20% opacity.
*   **Corner Radius:** `md` (1.5rem) to maintain the "soft" brand identity.

### Order Status Tracker (Custom Component)
Instead of a straight line, use a **Gradient Path**. As the delivery progresses, the line fills with the Pink-to-Purple gradient. The "Box in Hands" logo concept should be used as the active pointer icon, styled with a soft ambient shadow.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. If a text block is left-aligned, let the image on the right "bleed" off the edge of the container.
*   **Do** use the `xl` (3rem) corner radius for large landing page sections to create a "container-less" feeling.
*   **Do** prioritize white space. If you think there’s enough space, add 20% more.

### Don't
*   **Don't** use 100% black `#000000` for text. Always use `on-background` (`#2c2f30`) to keep the "Soft Minimalism" intact.
*   **Don't** use sharp corners (`none` or `sm`). Every element should feel safe and "smooth" to the touch.
*   **Don't** use standard drop shadows. If it looks like a default Photoshop shadow, it’s too dark. Aim for "Atmospheric Glow."