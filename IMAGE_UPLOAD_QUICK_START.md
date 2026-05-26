# Image Input Field - Quick Start Guide

## What Changed?

Image fields in the admin dashboard now have:
- 📁 **File picker** instead of manual path typing
- 👁️ **Image preview** showing what you're saving
- 💡 **Smart path suggestions** (e.g., `assets/courses/computer-science.jpg`)
- 🗑️ **Clear button** to remove images
- ✅ **Validation** for file type and size

## For Admins: How to Use

### Adding an Image

1. **Find the image field** in the form (e.g., "Course Image", "Logo Image")
2. **Click "Choose File"** button
3. **Select an image** from your computer (jpg, png, webp, etc.)
4. **See the suggested path** (e.g., `assets/courses/computer-science.jpg`)
5. **Click "Use This Path"** to accept it
6. **See the preview** appear
7. **Save the form**

### Editing an Image

1. **Open the form** to edit (click edit button on item)
2. **Current image shows** with its path
3. **Replace by clicking "Choose File"** OR
4. **Edit the path manually** in the text field
5. **Click "Clear"** to remove the image
6. **Save the form**

### Using an External URL

1. **Click in the path field** directly
2. **Paste HTTPS URL** (e.g., `https://example.com/logo.png`)
3. **Image preview loads** automatically
4. **Save the form**

## Path Examples

| Field | Suggested Path | Actual Folder |
|-------|---|---|
| Course Image | `assets/courses/computer-science.jpg` | Upload to: `assets/courses/` |
| University Logo | `assets/logos/upm-logo.png` | Upload to: `assets/logos/` |
| Campus Image | `assets/universities/upm-campus.jpg` | Upload to: `assets/universities/` |
| Team Photo | `assets/team/ahmad-mokadam.jpg` | Upload to: `assets/team/` |
| Student Photo | `assets/testimonials/john-doe.jpg` | Upload to: `assets/testimonials/` |
| Site Hero | `assets/site/hero.jpg` | Upload to: `assets/site/` |

## ⚠️ Important: File Upload Doesn't Auto-Deploy

The component does **NOT** automatically upload files to the server.

**What happens**:
1. You select a file → Component suggests path
2. You click "Use This Path" → Path is stored in database
3. **You must upload the actual image file** to the matching folder before deploying

**Why**: Keeps file control in your hands and doesn't use Firebase Storage quota.

**How to deploy**:
1. Admin selects file: `my-logo.png`
2. Suggested path: `assets/logos/my-logo.png`
3. **Before deploying**, you upload `my-logo.png` to `assets/logos/` folder in your project

## Supported File Types

✅ **Allowed**: jpg, jpeg, png, webp, svg  
❌ **Not allowed**: exe, js, html, txt, pdf, docx, etc.

## File Size Limit

- **Default**: 5 MB per image
- Images larger than this will be rejected with an error

## Forms with Image Fields

| Section | Image Fields | Count |
|---------|---|---|
| **Courses** | Course Image | 1 |
| **Universities** | Logo, Campus Image | 2 |
| **Team** | Team Member Photo | 1 |
| **Testimonials** | Student Photo | 1 |
| **Site Settings** | Logo, Hero Image, 8 Page Heroes | 10 |
| **TOTAL** | | **15 image fields** |

## Troubleshooting

### Image preview not showing?
- Check the path is correct
- Verify file exists in correct folder
- Ensure URL starts with `https://` if using external URL

### File too large error?
- Compress the image
- Use a smaller image file
- Max size is 5 MB

### Can't save the form?
- Check browser console for errors (F12)
- Ensure path starts with `assets/` or `https://`
- Try refreshing the page

### Images missing on website?
- **Most common**: Actual image file not uploaded to assets folder
- Verify file exists: `assets/path/to/filename.jpg`
- Check path in database matches file path exactly
- Case-sensitive on some servers: `Logo.jpg` ≠ `logo.jpg`

## Files to Know

### Where images live:
```
assets/
├── logos/              ← University logos, site logo
├── universities/       ← Campus images
├── courses/            ← Course images
├── team/               ← Team member photos
├── testimonials/       ← Student testimonial photos
├── home/               ← Page hero images
└── site/               ← Site-wide images
```

### How they're used:
1. **Database** stores the path: `assets/logos/upm-logo.png`
2. **Website** reads the path and loads from `assets/` folder
3. **You control** which files are in each folder

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open file picker | Click "Choose File" button |
| Accept suggested path | Click "Use This Path" button |
| Remove image | Click "Clear" button |
| Edit path manually | Click in text field and type |

## Best Practices

✅ **Do this**:
- Use clear, descriptive filenames: `upm-campus-2024.jpg`
- Keep images in the suggested folders
- Compress images before uploading (smaller = faster)
- Use consistent naming: `university-logo.png` not `Logo` or `logo2final`

❌ **Don't do this**:
- Don't use spaces in filenames: use `computer-science.jpg` not `computer science.jpg`
- Don't upload huge images: compress to <1MB when possible
- Don't mix cases: stick to lowercase: `logo.jpg` not `Logo.jpg`
- Don't use special characters: `university-logo.png` not `university&logo!.png`

## Image Quality Tips

For best quality on website:
- **Logos**: PNG with transparent background, min 100x100px
- **Photos**: JPG, 72-96 DPI, width 400-800px for small, 1200-1600px for large
- **Hero images**: JPG, landscape aspect ratio (16:9), 1920x1080px or larger
- **Max file size**: Keep under 2MB, aim for <500KB where possible

## Questions?

Check the full documentation: `IMAGE_INPUT_IMPLEMENTATION.md`

---

**TL;DR**: Pick file → See preview → Save path → Upload actual file before deploying
