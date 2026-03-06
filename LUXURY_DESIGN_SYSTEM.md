# Luxury Jewelry E-Commerce Landing Page

## 📋 Design System Documentation

This document outlines the complete design system, brand guidelines, and implementation details for the luxury jewelry e-commerce landing page.

---

## 1. 🎨 Color Palette

### Primary Colors
- **Pure White (Background)**: `#FFFFFF`
- **Rich Gold (Accent)**: `#D4AF37` - Used for CTAs, hover effects, primary headlines
- **Deep Charcoal (Text)**: `#333333` - Primary readability
- **Soft Grey (Secondary)**: `#666666` - Subtitles, borders, secondary text

### Secondary Colors
- **Section Background**: `#FAFAFA` or `#F9F9F9` - Subtle depth for alternating sections
- **Dark Footer**: `#1A1A1A` to `#333333` - Deep, elegant footer background

---

## 2. 🔤 Typography

### Font Families

#### Serif (Headings & Hero Text)
- **Font**: Cormorant Garamond, Playfair Display, Georgia (fallback)
- **Use**: All major headings, hero titles, section headers
- **Characteristics**: Elegant, thin strokes, thick curves, high-fashion aesthetic
- **Letter Spacing**: +2% to +5% (0.05em to 0.1em) for expansive, luxury feel

#### Sans-Serif (Body & Navigation)
- **Font**: Montserrat, Inter, -apple-system (fallback)
- **Use**: Body text, navigation, product information, CTAs
- **Weight**: 300-400 (lightweight to regular) for modern, uncluttered appearance
- **Letter Spacing**: Normal (0) for body, +5% (0.05em) for CTAs

### Typography Scale

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Hero Title | 64px | 400 | Main headline with overlay |
| Section Title | 48px | 400 | Major section headers |
| Collection Title | 32px | 400 | Collection headers |
| Subsection Title | 24px | 400 | Secondary headers |
| Product Title | 16px | 400 | Individual product names |
| Body Text | 16px | 300 | Descriptions, details |
| Small Text | 14px | 300 | Metadata, dates, categories |
| Tiny Text | 12px | 300 | Labels, captions |

---

## 3. 📏 Spacing & Grid System

### Spacing Scale (8px Base Unit)
```
--spacing-xxs:    4px
--spacing-xs:     8px
--spacing-s:      16px
--spacing-m:      24px
--spacing-l:      32px
--spacing-xl:     48px
--spacing-xxl:    80px (MINIMUM between major sections)
--spacing-xxxl:   120px
```

### Critical Constraint: Generous White Space
- **Minimum vertical padding between major sections**: 80px
- **Sections must breathe** - Use consistent 80px-120px top/bottom padding
- **Gap between grid items**: 32px (desktop), 24px (tablet), 16px (mobile)

### Grid Systems

#### Primary: 6-Column Grid
- **Use**: New Arrivals, Reviews, Blog Posts
- **Breakpoint Adjustments**:
  - Desktop (1920px+): 6 columns
  - Tablet (768px-1440px): 4 columns
  - Mobile (<768px): 2 columns
  - Small Mobile (<480px): 1 column

#### 5-Column Grid
- **Use**: Category Icons
- **Similar breakpoint adjustments**

#### 4-Column Grid
- **Use**: Fine/Premium Collections
- **Similar breakpoint adjustments**

#### Bidirectional Support
- Default: Left-to-Right (LTR)
- Supported: Right-to-Left (RTL) for Arabic/Hebrew languages
- CSS automatically mirrors layouts using `[dir="rtl"]` selector

---

## 4. 🔘 Button Styles

### Gold Ghost Button (Outlined)
```css
color: #D4AF37;
background-color: transparent;
border: 2px solid #D4AF37;
Hover: Background becomes gold, text becomes white
```
**Use**: Secondary CTAs, calls-to-action on light backgrounds

### Gold Solid Button (Filled)
```css
color: white;
background-color: #D4AF37;
border: 2px solid #D4AF37;
Hover: Background becomes charcoal (#333333), border updates
```
**Use**: Primary CTAs, main action buttons

### View Details Button
- **Minimal styled button** on product cards
- **Appears on hover** with upward animation
- **Color**: Semi-transparent gold with white text

---

## 5. 🏗️ Layout Structure

### Section A: Hero & New Arrivals
**Hero Section**
- Full-width background image (600px height)
- Centered "SERENITY IN GOLD" heading (64px serif)
- Centered subtitle and CTA button
- Soft overlay (rgba(0,0,0,0.2))

**New Arrivals Grid**
- 6-column grid layout
- Product cards with hover lift effect (+8px translateY)
- Image with 1:1 aspect ratio
- "View Details" button appears on hover
- Product title and price below image

### Section B: Asymmetrical Lifestyle Banners
- Left side: Text content ("ARTISTRY IN ADORNMENT" in gold serif)
- Right side: 2-image grid (ears + pedestal display)
- Background: Soft sand gradient (#F9F9F9 to #FAFAFA) on right 60%
- Images scale up slightly on hover (1.08x)
- CTA button in gold solid style

### Section C: Catalog & Categories
**Large Banner**
- Spans 4 out of 6 columns
- 400px height
- "MODEL WEAR" lifestyle image with overlay
- Centered content with title, subtitle, CTA

**Category Icons**
- 5 columns of square tiles with centered icons
- Grey borders, hover effect with border color change to gold
- Icon emoji + centered text label below

### Section D: Collection Grids
- Multiple independent grids (6, 5, 4 columns)
- Each with distinct collection title
- "View All →" link in gold
- Same product card styling as Section A

### Section E: Final Banner & Content
**Final Banner**
- Full-width lifestyle image
- New Launch label in gold
- "BABY JEWELS" title in serif font
- Description and CTA button
- Semi-transparent dark overlay (rgba(0,0,0,0.4))

**Reviews & Blog**
- 6-column customer review cards with avatars
- 6-column blog post cards with images
- Reviews: Star rating + text + author
- Blog: Date + title + excerpt + "Read More" link

### Section F: Footer
- Deep charcoal background (#1A1A1A)
- 4-column layout: About Us, Customer Service, Policies, Follow Us
- Social media icons in circular borders
- Footer divider with gold accent
- Copyright, payment method icons

---

## 6. 🎯 Component Specifications

### Product Card
```
- Aspect Ratio: 1:1 (square image)
- Hover Effects:
  - Translate Y: -8px (upward lift)
  - Image scale: 1.05x
  - Border: 1px solid #666666
  - Shadow: 0 4px 16px rgba(0,0,0,0.12)
- Content Spacing: 24px margin below image
```

### Image Hover Effects
- Scale: 1.05x to 1.08x depending on context
- Transition: 0.5s ease-in-out (smooth, slow zoom)
- Used on: Product images, lifestyle banners, blog images

### Shadows (Four Levels)
```
--shadow-sm:   0 2px 8px rgba(0,0,0,0.08)
--shadow-md:   0 4px 16px rgba(0,0,0,0.12)
--shadow-lg:   0 8px 32px rgba(0,0,0,0.16)
--shadow-lift: 0 12px 40px rgba(0,0,0,0.2)
```

---

## 7. 📱 Responsive Breakpoints

```
Desktop:     1920px+
Tablet:      768px - 1440px
Mobile:      480px - 767px
Small Mobile: < 480px
```

### Key Adjustments
- **Font sizes** reduce at each breakpoint
- **Grid columns** reduce: 6→4→2→1
- **Padding** reduces: 80px→48px→32px
- **Gap** reduces: 32px→24px→16px
- **Hero height** reduces: 600px→400px→300px

---

## 8. ♿ Accessibility Features

### Keyboard Navigation
- All buttons have focus-visible states (gold outline)
- Links are properly styled and visible
- Tab order follows logical flow

### Motion Preferences
- Respects `prefers-reduced-motion` media query
- Animation duration set to 0.01ms if user prefers reduced motion

### Contrast
- WCAG AA compliant color ratios
- High contrast mode support (increases charcoal darkness)

### Voice/Screen Reader
- Semantic HTML structure
- Proper alt text on images (provided in component)
- ARIA labels for interactive elements

---

## 9. 💻 Component Usage

### Import Main Component
```tsx
import { LuxuryLanding } from '@/components/LuxuryLanding';

export default function HomePage() {
  return <LuxuryLanding />;
}
```

### Import Individual Sections
```tsx
import { 
  HeroSection, 
  NewArrivalsGrid, 
  AsymmetricalBanners,
  CatalogSection,
  CollectionGrids,
  FinalBanner,
  ReviewsAndBlog,
  Footer 
} from '@/components/LuxuryLanding';
```

### Pass Custom Data
```tsx
<NewArrivalsGrid 
  products={[
    {
      id: 'product-1',
      title: 'Diamond Ring',
      price: 2500,
      image: '/images/ring.jpg'
    },
    // ... more products
  ]}
/>

<CatalogSection 
  categories={[
    { id: 'necklaces', name: 'Necklaces', icon: '⭐' },
    // ... more categories
  ]}
/>
```

---

## 10. 🎨 CSS Classes Reference

### Layout Classes
- `.products-grid-6`: 6-column grid
- `.products-grid-5`: 5-column grid
- `.products-grid-4`: 4-column grid
- `.category-icons-container`: Category grid

### Component Classes
- `.hero-section`: Hero banner
- `.product-card`: Individual product
- `.review-card`: Review item
- `.blog-card`: Blog post item
- `.btn`: All buttons
- `.btn-gold-ghost`: Outlined gold button
- `.btn-gold-solid`: Solid gold button

### Section Classes
- `.hero-section`
- `.new-arrivals-section`
- `.asymmetrical-banners-section`
- `.catalog-section`
- `.collection-grids-section`
- `.final-banner-section`
- `.reviews-and-blog-section`
- `.luxury-footer`

---

## 11. 🌍 Bidirectional (RTL) Support

### Implementation
Add `dir="rtl"` to the root element for Arabic/Hebrew support:

```html
<div class="luxury-landing" dir="rtl">
  <!-- Component content -->
</div>
```

### CSS Automatically Handles
- Text direction reversal
- Text alignment flip
- Grid column order reversal
- Margin/padding direction flip

### Image Considerations
- Some asymmetrical images may need alternate versions for RTL
- Consider using separate image sets if directionality matters

---

## 12. 📸 Image Specifications

### Required Image Paths
```
/images/
  ├── hero-jewelry.jpg (full width, landscape)
  ├── lifestyle/
  │   ├── model-earrings.jpg (1:1 square)
  │   ├── pedestal-display.jpg (1:1 square)
  │   ├── model-wear.jpg (4:3 landscape)
  │   └── final-banner.jpg (16:9 or 2:1)
  ├── products/
  │   ├── ring-1.jpg through ring-6.jpg (1:1 squares)
  │   └── ... more product images
  ├── collections/
  │   ├── necklace-*.jpg
  │   ├── earring-*.jpg
  │   ├── ring-fine-*.jpg
  │   └── ... more collection images
  ├── reviews/
  │   └── customer-*.jpg (profile photos, square)
  └── blog/
      └── post-*.jpg (landscape, blog thumbnails)
```

### Image Optimization
- Use WebP format with JPG fallback
- Lazy load images below the fold
- Responsive image sizes for different screen widths
- Compress to <100KB per image

---

## 13. 🚀 Performance Considerations

- **CSS-in-JS**: Pre-calculated, no runtime overhead
- **Image Loading**: Native lazy loading with `loading="lazy"`
- **Fonts**: Serif font loaded via system or Google Fonts with `font-display: swap`
- **Grid System**: CSS Grid (native browser support, no JS required)
- **Animations**: GPU-accelerated (transform, opacity only)

---

## 14. ✅ Validation Checklist

### Design System Check
- [ ] Colors match hex values exactly
- [ ] Fonts are serif for headings, sans-serif for body
- [ ] Spacing follows 8px base unit
- [ ] Minimum 80px between major sections
- [ ] All CTAs are either Gold Ghost or Gold Solid style

### Layout Check
- [ ] Hero spans full width with 600px height
- [ ] 6-column grid for products
- [ ] Asymmetrical banners properly positioned
- [ ] Category grid is 5 columns
- [ ] Footer is 4-column layout

### Interactivity Check
- [ ] Hover effects on cards (upward lift, shadow)
- [ ] Image zoom on hover (1.05x-1.08x)
- [ ] View Details button appears on product hover
- [ ] Button states clear (ghost, solid, hover)

### Responsive Check
- [ ] Grids collapse properly at breakpoints
- [ ] Text sizes adjust for mobile
- [ ] Touch targets are at least 44px tall
- [ ] Spacing reduces appropriately

### Accessibility Check
- [ ] Focus visible on all interactive elements
- [ ] High contrast ratios (WCAG AA)
- [ ] Semantic HTML structure
- [ ] Alt text on all images
- [ ] Respects prefers-reduced-motion

### RTL Check
- [ ] Layout mirrors correctly (if applicable)
- [ ] Text direction switches
- [ ] Icons/symbols still make sense
- [ ] Margins/padding flip correctly

---

## 15. 📝 Notes for Developers

### Data Integration
The components accept optional props for dynamic data. If no props are provided, they render with placeholder data. To connect real data:

```tsx
// Fetch from your API/database
const products = await fetchNewArrivals();
const reviews = await fetchReviews();
const blogPosts = await fetchBlogPosts();

// Pass to components
<NewArrivalsGrid products={products} />
<ReviewsAndBlog reviews={reviews} blogPosts={blogPosts} />
```

### Customization
To override colors, modify the CSS variables:
```css
:root {
  --luxury-gold: #YOUR_COLOR;
  --luxury-charcoal: #YOUR_COLOR;
  /* ... etc */
}
```

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid support required
- Flexbox support required
- CSS custom properties support required

---

## 📞 Support & Maintenance

For questions about:
- **Layout & Spacing**: See Section 3 (Spacing & Grid)
- **Typography**: See Section 2 (Typography)
- **Colors**: See Section 1 (Color Palette)
- **Components**: See Section 6 (Component Specifications)
- **Responsive**: See Section 7 (Breakpoints)

---

**Design System Version**: 1.0.0  
**Last Updated**: March 2024  
**Status**: Production Ready
