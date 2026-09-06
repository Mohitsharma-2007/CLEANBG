# Open-Source Web Image Toolkit: Reference List

## Goal

Build a web-based image utility/editor where the source code can be reused, modified, self-hosted, and integrated into our own product.

**Important:** Open-source code and open-source model weights are separate licensing questions. Before shipping commercially, verify the license of every repository, dependency, pretrained model, LUT pack, font, icon, and asset that is included.

---

## 1. Recommended Architecture

For a serious all-in-one web image product, I would not depend on one repository for everything.

A practical stack is:

- **Editor/UI:** miniPaint, OpenShop, Jodit Image Editor, or a custom React/Fabric.js editor.
- **Browser GPU effects:** mini-gl, Clarity, WebGLImageFilter.
- **Server-side image processing:** Sharp/libvips.
- **Browser conversion/compression:** Pic Smaller or the browser's Canvas/WebCodecs stack.
- **AI Background Removal:** a separately licensed background-removal model/runtime.
- **AI Upscaling:** Real-ESRGAN/Web Real-ESRGAN or another model with a license suitable for the product.
- **LUT processing:** lut-filter + our own `.cube` LUT parser/preset system.
- **Metadata:** Exif.js / exif-parser.
- **Storage:** local browser processing where possible, with optional server processing for large/AI jobs.

This gives us a modular product instead of trying to force one project to do everything.

---

# 2. Image Converter

## Pic Smaller

Repository:
https://github.com/joye61/pic-smaller

Why:
- Browser-based
- Open source
- Batch processing
- JPEG, PNG, WebP, GIF, SVG, AVIF
- HEIC/HEIF decoding
- Resize and crop
- Quality controls
- ZIP download
- Client-side/private processing

Good candidate for:
- JPG → PNG
- PNG → JPG
- WebP conversion
- AVIF conversion
- HEIC/HEIF workflows
- Batch conversion

License shown by repository: verify current repository license before shipping.

## Browser Converter

Repository:
https://github.com/wendyliga/converter

Why:
- Entirely browser-based
- PNG, JPG, WebP, AVIF, HEIC, TIFF, SVG, BMP, ICO input
- JPG/PNG/WebP output
- Batch conversion
- Quality control
- Resize
- Transparency handling
- Metadata controls

This is a particularly useful reference for a privacy-first converter.

---

# 3. Image Resizer / Cropper

## Sharp

Repository:
https://github.com/lovell/sharp

Why:
- Extremely mature Node.js image-processing library
- JPEG, PNG, WebP, AVIF, TIFF and more
- High-performance resizing
- Rotation
- Extraction
- Compositing
- Gamma correction
- ICC/color-profile and alpha handling
- Lanczos resampling

License: Apache-2.0.

Best use:
- Backend processing
- Large images
- Batch operations
- Production conversion/resizing pipeline

## EZCrop

Repository:
https://github.com/leemark/ezcrop

Why:
- Browser-based
- Drag/drop
- Interactive crop
- Pan/zoom
- Preset aspect ratios
- Custom dimensions
- WebP/JPEG/AVIF export
- Quality controls
- File-size preview

Good reference for a lightweight client-side Crop + Resize tool.

## CanvasPlus

Repository:
https://github.com/jhuckaby/canvas-plus

Why:
- Works in Node and browser
- Resize
- Crop
- Rotate
- Flip
- Text
- Curves
- Brightness/contrast/saturation
- Temperature
- Convolution
- Sharpen
- Blur
- JPEG/PNG/GIF/WebP support

Useful as a general image-processing library reference.

---

# 4. Image Filters / Effects

## mini-gl

Repository:
https://github.com/xdadda/mini-gl

One of the strongest references for our browser editor.

Includes:
- Brightness
- Exposure
- Gamma
- Contrast
- Shadows
- Highlights
- Bloom
- Temperature
- Tint
- Vibrance
- Saturation
- Sepia
- Clarity/sharpness
- Noise reduction
- Vignette
- Curves
- Instagram-style filters
- Blender
- Bokeh
- Gaussian blur
- Perspective correction
- Transform

It uses WebGL2 and is MIT licensed.

This could form the basis of a fast real-time filter engine.

## Clarity

Repository:
https://github.com/calrk/Clarity

Includes **59 composable filters**.

Families include:
- Blur
- Desaturate
- Glow
- Gradient Map
- Levels
- Noise
- Pixelate
- Posterise
- Vignette
- Edge detection
- Chromatic aberration
- Fish-eye
- Mirror
- Wave
- Displace
- Blend
- Multiply
- Mask
- Cloud/gradient generators
- CRT-style effects
- Other GPU effects

It supports GPU/WebGL2 with CPU fallback.

Excellent reference for a large extensible filter engine.

## WebGLImageFilter

Repository:
https://github.com/phoboslab/WebGLImageFilter

Includes:
- Brightness
- Saturation
- Contrast
- Hue
- Sepia
- Vintage
- Kodachrome
- Technicolor
- Polaroid
- Sharpen
- Emboss
- Pixelate
- Edge detection
- Blur
- Convolution

License: MIT.

Useful for creating classic/social-style filter presets.

---

# 5. 100+ Snapchat/Instagram-Style Filters

Rather than hard-code 100 completely different algorithms, build a **preset engine**.

Each filter should be a parameter recipe:

```json
{
  "name": "Warm Vintage",
  "brightness": 0.04,
  "contrast": 1.08,
  "saturation": 0.88,
  "temperature": 0.12,
  "vignette": 0.18,
  "grain": 0.06,
  "lut": "warm-vintage.cube",
  "intensity": 0.85
}
```

Then create 100–300 presets by combining:
- LUT
- Exposure
- Contrast
- Highlights
- Shadows
- Temperature
- Tint
- Saturation
- Vibrance
- Curves
- Grain
- Vignette
- Bloom
- Blur
- Sharpen
- Color overlays
- Blend modes
- Texture overlays

This is much more maintainable than writing 100 separate filters.

### Filter categories to implement

**Basic**
- Original
- Bright
- Dark
- Contrast+
- Contrast-
- Saturated
- Desaturated
- Vibrant
- Muted
- Neutral

**Film**
- Kodak
- Fuji
- Portra-style
- Cine
- Vintage
- Retro
- Faded
- Film Grain
- Disposable Camera
- Polaroid-style

**Warm**
- Golden Hour
- Sunset
- Honey
- Amber
- Warm Skin
- Summer
- Peach
- Orange Glow

**Cool**
- Arctic
- Blue Hour
- Cyan
- Steel
- Moonlight
- Winter
- Teal

**Social**
- Instagram-style
- Soft
- Clean
- Moody
- Aesthetic
- Street
- Fashion
- Portrait
- Travel
- Food

**Creative**
- Neon
- Cyberpunk
- Dream
- VHS
- CRT
- Glitch
- Halftone
- Pixel
- Poster
- Comic
- Sketch
- Oil
- Cartoon

**Portrait**
- Skin Soft
- Skin Warm
- Matte
- Clean Portrait
- High-Key
- Low-Key
- Studio
- Beauty
- Editorial

---

# 6. LUT / Color Grading

## lut-filter

Repository:
https://github.com/lijialiang/lut-filter

Why:
- WebGL
- WebGPU
- Image LUT rendering
- MIT license
- Designed specifically for LUT filter effects

Good foundation for:
- `.cube` LUT support
- Cinematic presets
- Film looks
- Custom user LUT upload
- LUT intensity slider
- LUT preview thumbnails

### LUT features we should implement

- Import `.cube`
- Export/save LUT presets where feasible
- LUT intensity 0–100%
- Before/after preview
- LUT search
- LUT categories
- Favorites
- Recent LUTs
- Custom LUT upload
- LUT thumbnails
- Combine LUT + manual adjustments
- Multiple LUT blend modes
- LUT strength
- Per-layer LUT
- Non-destructive LUT adjustment

---

# 7. Professional Color Grading

Implement a Lightroom/Photoshop-style adjustment panel:

### Light
- Exposure
- Brightness
- Contrast
- Highlights
- Shadows
- Whites
- Blacks
- Gamma

### Color
- Temperature
- Tint
- Saturation
- Vibrance
- Hue

### Curves
- RGB curve
- Red curve
- Green curve
- Blue curve
- Luminance curve
- Point curve
- Preset curves

### HSL
- Red
- Orange
- Yellow
- Green
- Aqua
- Blue
- Purple
- Magenta

For every color:
- Hue
- Saturation
- Luminance

### Color grading wheels
- Shadows
- Midtones
- Highlights
- Global

### Additional
- Color balance
- Selective color
- Split toning
- White balance
- Auto color
- Auto contrast
- Auto levels

CanvasPlus and mini-gl are useful implementation references for curves and color operations.

---

# 8. Image Enhancement

Implement:

- Sharpen
- Unsharp mask
- Clarity
- Texture
- Noise reduction
- Grain
- Deblur
- Denoise
- Detail enhancement
- HDR-style effect
- Local contrast
- Smart contrast
- Auto enhance
- Auto levels
- Auto white balance

For AI enhancement/upscaling, keep the model layer separate from normal filters.

---

# 9. Background Removal

Recommended reference:

## bg-remove

Repository:
https://github.com/addyosmani/bg-remove

Why:
- Browser application
- React/Vite
- RMBG-1.4
- WebGPU/WebGL approach
- Client-side processing

Use this as the UI/runtime reference, but check the model-weight license before commercial deployment.

## rembg

Repository:
https://github.com/danielgatis/rembg

Why:
- Mature background-removal ecosystem
- Multiple model options
- Python API/CLI/server possibilities
- Can be used as a backend inference service

Again, check each model's license separately from the rembg code license.

### Background-removal features to add

- One-click remove
- Transparent PNG
- White background
- Custom background
- Background blur
- Edge refinement
- Hair refinement
- Shadow preservation
- Manual erase
- Manual restore
- Feather
- Smooth edges
- Defringe/decontaminate
- Object/subject cutout
- Before/after slider

---

# 10. Image Upscaling

## Web Real-ESRGAN

Repository:
https://github.com/mediatekstack/web-realesrgan67

Useful for:
- Browser-based AI upscaling
- Real-ESRGAN
- Real-CUGAN
- WebGL/WebGPU

## Real-ESRGAN Web App

Repository:
https://github.com/Anishrkhadka/real-esrgan-web-app

Useful as a reference for:
- AI upscaling UI
- Multiple models
- GPU processing
- Tiling
- FP16
- Batch processing

## Upscayl

Repository:
https://github.com/upscayl/upscayl

Excellent reference for:
- AI upscaling UX
- Real-ESRGAN ecosystem
- Multiple upscale models
- Batch workflow

Upscayl itself is primarily desktop, so use it as an architecture/model/UX reference rather than assuming its whole app can be dropped into a web project.

---

# 11. Metadata / EXIF

## Exif.js

Repository:
https://github.com/exif-js/exif-js

Supports browser-side reading of:
- EXIF
- IPTC
- XMP-related data

License: MIT.

Useful features:
- Show camera information
- Show dimensions
- Show orientation
- Show date
- Remove metadata on export
- Privacy warning

## exif-parser

Repository:
https://github.com/bwindels/exif-parser

Pure JavaScript EXIF parser that can also be bundled for browser use.

---

# 12. Complete Editor / Photoshop-Like Base

## miniPaint

Repository:
https://github.com/viliusle/miniPaint

Useful for:
- Layers
- Selection
- Clipboard
- Crop
- Resize
- Rotate
- Flip
- Filters
- Color correction
- Histogram
- EXIF
- Multiple image formats
- Browser-only editing

License: MIT.

## OpenShop

Repository:
https://github.com/SysAdminDoc/Openshop

Useful for:
- Photoshop-inspired workflow
- Layers
- Pixel selections
- Transform
- Text
- Gradients
- WebGPU/WebGL accelerated filters
- PSD import
- AI-related tools
- Browser application

Check its current repository license and dependencies before using it as a commercial base.

## Jodit Image Editor

Repository:
https://github.com/jodit/jodit-image-editor

Useful for:
- Crop
- Resize
- Rotate
- Flip
- Filters
- Fine-tuning
- Text
- Undo/redo
- Plugin API
- Responsive UI

License: MIT.

## React Image Editor

Repository:
https://github.com/ascentspark/react-image-editor

Useful if our application is React-based:
- Crop
- Filters
- Draw
- Text
- Shapes
- Layers
- Redaction
- Background removal
- Export
- Fabric.js integration

---

# 13. Other Image Tools We Can Implement

## Basic

- Resize
- Crop
- Rotate
- Flip
- Straighten
- Perspective
- Skew
- Compress
- Convert
- Rename
- Batch process
- ZIP export

## Canvas

- Canvas resize
- Expand canvas
- Fit image
- Fill image
- Background color
- Transparent canvas
- Aspect-ratio presets
- Social media presets

## Editing

- Brush
- Eraser
- Clone stamp
- Healing
- Blur brush
- Pixelate brush
- Smudge
- Dodge
- Burn
- Sharpen brush
- Red-eye removal
- Object removal
- Watermark
- Text
- Shapes
- Arrows
- Frames
- Stickers

## Selection

- Rectangle
- Ellipse
- Freehand
- Polygon
- Magic wand
- Color selection
- Subject selection
- Invert selection
- Feather
- Expand
- Contract
- Copy/paste selection

## Layers

- Add layer
- Delete layer
- Duplicate
- Rename
- Reorder
- Hide/show
- Lock
- Opacity
- Blend modes
- Masks
- Adjustment layers
- Group layers

## Blend Modes

- Normal
- Multiply
- Screen
- Overlay
- Soft Light
- Hard Light
- Darken
- Lighten
- Difference
- Exclusion
- Color Dodge
- Color Burn
- Hue
- Saturation
- Color
- Luminosity

## Effects

- Blur
- Gaussian blur
- Motion blur
- Lens blur
- Bokeh
- Bloom
- Glow
- Vignette
- Grain
- Noise
- Pixelate
- Halftone
- Chromatic aberration
- Glitch
- VHS
- CRT
- Scanlines
- Film scratches
- Light leaks
- Lens flare

## Artistic

- Cartoon
- Sketch
- Pencil
- Ink
- Oil painting
- Watercolor
- Posterize
- Comic
- Pop art
- Duotone
- Tritone
- Threshold
- Mosaic
- Emboss
- Edge detect

---

# 14. Snapchat-Style AR Filters

This should be treated as a separate subsystem from normal image filters.

Possible features:

- Face detection
- Face landmarks
- Face mesh
- Skin segmentation
- Background segmentation
- Face retouching
- Eye effects
- Makeup overlays
- Glasses
- Hats
- Masks
- Ears
- Beards
- Hair effects
- Face distortion
- Big eyes
- Small face
- Smile effects
- Color lenses
- Animated stickers
- 2D face stickers
- 3D face accessories

For still-image filters, the pipeline can be:

`Face detection → landmarks → mask/mesh → overlay/effect → color grade → export`

For true Snapchat-like live AR, WebGL/WebGPU + a face-landmark/mesh model is preferable.

---

# 15. Batch Processing

A major feature worth adding:

- Batch resize
- Batch convert
- Batch compress
- Batch watermark
- Batch rename
- Batch filter
- Batch LUT
- Batch background removal
- Batch upscale
- Batch crop
- Batch metadata removal

Add:
- ZIP download
- Progress bar
- Cancel
- Retry failed items
- Presets
- Queue management

---

# 16. Privacy Features

Because many operations can happen locally:

- "Processed locally" indicator
- No upload for normal editing
- Local-only conversion
- Local-only filters
- Local-only compression
- Local-only metadata inspection
- Optional server AI processing
- Automatic metadata removal
- EXIF/GPS warning
- Clear processing history

This can become a strong product differentiator.

---

# 17. Suggested Product Structure

```text
Image Studio
│
├── AI Tools
│   ├── Background Remover
│   ├── Image Upscaler
│   ├── Image Enhancer
│   ├── Object Remover
│   └── Face/Subject Cutout
│
├── Transform
│   ├── Resize
│   ├── Crop
│   ├── Rotate
│   ├── Flip
│   ├── Perspective
│   └── Canvas
│
├── Convert
│   ├── JPG
│   ├── PNG
│   ├── WebP
│   ├── AVIF
│   ├── GIF
│   ├── SVG
│   ├── TIFF
│   └── HEIC
│
├── Adjust
│   ├── Exposure
│   ├── Brightness
│   ├── Contrast
│   ├── Highlights
│   ├── Shadows
│   ├── Whites
│   ├── Blacks
│   ├── Temperature
│   ├── Tint
│   ├── Vibrance
│   ├── Saturation
│   ├── Curves
│   ├── HSL
│   └── Color Grading
│
├── Filters
│   ├── 100+ Presets
│   ├── Film
│   ├── Vintage
│   ├── Portrait
│   ├── Cinematic
│   ├── Aesthetic
│   ├── Black & White
│   ├── Creative
│   └── User Filters
│
├── LUTs
│   ├── Built-in LUTs
│   ├── Import .cube
│   ├── LUT Intensity
│   └── LUT Favorites
│
├── Retouch
│   ├── Heal
│   ├── Clone
│   ├── Blur
│   ├── Sharpen
│   ├── Dodge
│   ├── Burn
│   └── Red Eye
│
├── Effects
│   ├── Blur
│   ├── Glow
│   ├── Grain
│   ├── VHS
│   ├── Glitch
│   ├── Halftone
│   ├── Bokeh
│   └── Lens Effects
│
├── Markup
│   ├── Text
│   ├── Shapes
│   ├── Arrows
│   ├── Drawing
│   ├── Watermark
│   └── Stickers
│
├── Metadata
│   ├── EXIF Viewer
│   ├── Remove Metadata
│   └── Privacy Check
│
└── Batch
    ├── Convert
    ├── Resize
    ├── Compress
    ├── Filter
    ├── LUT
    ├── Watermark
    ├── Background Removal
    └── Upscale
```

---

# 18. My Recommended Combination

If the goal is to build a **serious web-based Photoshop/Photopea + Remove.bg + image utility product**, I would investigate these first:

| Requirement | Primary Reference |
|---|---|
| Full browser editor | miniPaint / OpenShop |
| React editor | React Image Editor |
| Crop/resize | EZCrop |
| Backend image processing | Sharp |
| Browser conversion | Pic Smaller |
| Browser filters | mini-gl |
| 50+ advanced filters | Clarity |
| Classic WebGL filters | WebGLImageFilter |
| LUTs | lut-filter |
| Background removal | bg-remove + rembg |
| AI upscaling | Web Real-ESRGAN |
| Metadata | Exif.js |
| EXIF parser | exif-parser |

## Most important recommendation

Don't copy one giant project and try to make it do everything.

Build a **modular image engine**:

```text
                 ┌───────────────┐
                 │   Web Editor  │
                 └───────┬───────┘
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
   Transform          Filters           AI Tools
       │                 │                  │
  Crop/Resize       GPU/WebGL         Background Remove
  Rotate/Flip       LUTs               Upscaler
  Perspective       Curves             Enhancer
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                  Export / Download
```

That approach lets us replace an individual component later without rebuilding the entire application.

---

# 19. Licensing Checklist

Before copying code into the product, check:

1. Repository license.
2. Individual dependency licenses.
3. Model-weight license.
4. LUT license.
5. Font license.
6. Icon/illustration license.
7. Sample-image licenses.
8. Whether commercial use is allowed.
9. Attribution requirements.
10. Whether modified versions have additional obligations.

**Do not assume that "GitHub + open source" means every asset in the repository is free for commercial redistribution.**

For AI features this distinction is especially important: the software runtime can be permissively licensed while the pretrained model weights have separate restrictions.

---

# 20. Source References

- miniPaint: https://github.com/viliusle/miniPaint
- OpenShop: https://github.com/SysAdminDoc/Openshop
- React Image Editor: https://github.com/ascentspark/react-image-editor
- Jodit Image Editor: https://github.com/jodit/jodit-image-editor
- Sharp: https://github.com/lovell/sharp
- Pic Smaller: https://github.com/joye61/pic-smaller
- Browser Converter: https://github.com/wendyliga/converter
- EZCrop: https://github.com/leemark/ezcrop
- CanvasPlus: https://github.com/jhuckaby/canvas-plus
- mini-gl: https://github.com/xdadda/mini-gl
- Clarity: https://github.com/calrk/Clarity
- WebGLImageFilter: https://github.com/phoboslab/WebGLImageFilter
- CanvasFilters: https://github.com/kig/canvasfilters
- LUT Filter: https://github.com/lijialiang/lut-filter
- bg-remove: https://github.com/addyosmani/bg-remove
- rembg: https://github.com/danielgatis/rembg
- Web Real-ESRGAN: https://github.com/mediatekstack/web-realesrgan67
- Real-ESRGAN Web App: https://github.com/Anishrkhadka/real-esrgan-web-app
- Upscayl: https://github.com/upscayl/upscayl
- Exif.js: https://github.com/exif-js/exif-js
- exif-parser: https://github.com/bwindels/exif-parser

---

## Final Direction

The strongest product concept is not simply an "online Photoshop."

It can be positioned as an **all-in-one AI + professional image utility webapp**:

**Remove BG → Upscale → Enhance → Resize → Convert → Compress → Edit → Color Grade → LUT → 100+ Filters → Retouch → Watermark → Batch Process → Export**

with normal editing performed locally in the browser whenever practical, and AI processing handled locally or through an optional backend depending on model size and licensing.
