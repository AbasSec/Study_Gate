/**
 * Reusable Image Input Field Component
 * Supports manual path/URL input, file picker with path suggestions, and image preview
 *
 * Mode: Local asset path helper with optional external URL support
 * - Admin selects file → UI suggests asset path
 * - Admin manually places file in assets folder
 * - Path string stored in Firestore
 * - Frontend renders using existing path resolution
 */

class ImageInputField {
    constructor(config) {
        this.fieldId = config.fieldId;
        this.label = config.label || 'Image';
        this.value = config.value || '';
        this.onChange = config.onChange || null;
        this.placeholder = config.placeholder || 'assets/images/example.jpg';
        this.folderHint = config.folderHint || '';
        this.allowedTypes = config.allowedTypes || ['jpg', 'jpeg', 'png', 'webp', 'svg'];
        this.maxSizeMB = config.maxSizeMB || 5;
        this.previewAlt = config.previewAlt || 'Image preview';
        this.required = config.required || false;
        this.disabled = config.disabled || false;
        this.help = config.help || '';
        this.suggestedFolder = config.suggestedFolder || 'assets/images';

        this.createFieldStructure();
        this.attachEventListeners();
        this.updatePreview();
    }

    createFieldStructure() {
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.className = 'image-input-field-wrapper';
        wrapper.id = `${this.fieldId}-wrapper`;

        // Label
        const label = document.createElement('label');
        label.htmlFor = `${this.fieldId}-input`;
        label.className = 'image-input-label';
        label.innerHTML = this.label + (this.required ? ' <span class="required">*</span>' : '');

        // Preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        previewContainer.id = `${this.fieldId}-preview`;
        previewContainer.innerHTML = `
            <img id="${this.fieldId}-preview-img" src="" alt="${this.previewAlt}" class="image-preview-img">
            <div id="${this.fieldId}-preview-fallback" class="image-preview-fallback">
                <i class="bi bi-image"></i>
                <p>No image selected</p>
            </div>
        `;

        // Controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'image-input-controls';

        // File input (hidden)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `${this.fieldId}-file`;
        fileInput.accept = this.allowedTypes.map(t => `.${t}`).join(',');
        fileInput.style.display = 'none';

        // Manual path/URL input
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.id = `${this.fieldId}-input`;
        textInput.className = 'image-input-text';
        textInput.placeholder = this.placeholder;
        textInput.value = this.value;
        textInput.disabled = this.disabled;

        // Upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'btn btn-outline btn-compact image-upload-btn';
        uploadBtn.innerHTML = '<i class="bi bi-cloud-upload"></i> Choose File';
        uploadBtn.disabled = this.disabled;
        uploadBtn.onclick = (e) => {
            e.preventDefault();
            fileInput.click();
        };

        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn btn-outline btn-compact image-clear-btn';
        clearBtn.innerHTML = '<i class="bi bi-x-circle"></i> Clear';
        clearBtn.disabled = this.disabled;
        clearBtn.onclick = (e) => {
            e.preventDefault();
            this.clear();
        };

        // Suggested path display
        const suggestedPath = document.createElement('div');
        suggestedPath.id = `${this.fieldId}-suggested`;
        suggestedPath.className = 'image-suggested-path';
        suggestedPath.style.display = 'none';

        // Info container
        const infoContainer = document.createElement('div');
        infoContainer.className = 'image-input-info';

        // File size info
        const sizeInfo = document.createElement('small');
        sizeInfo.className = 'image-size-info';
        sizeInfo.textContent = `Max file size: ${this.maxSizeMB}MB. Allowed: ${this.allowedTypes.join(', ').toUpperCase()}`;

        // Validation error
        const errorMsg = document.createElement('div');
        errorMsg.id = `${this.fieldId}-error`;
        errorMsg.className = 'image-input-error';
        errorMsg.style.display = 'none';

        // Current path display
        const currentPath = document.createElement('div');
        currentPath.className = 'image-current-path';
        currentPath.id = `${this.fieldId}-current-path`;

        // Assemble structure
        controlsContainer.appendChild(uploadBtn);
        controlsContainer.appendChild(clearBtn);
        controlsContainer.appendChild(suggestedPath);

        infoContainer.appendChild(sizeInfo);
        infoContainer.appendChild(errorMsg);

        wrapper.appendChild(label);
        wrapper.appendChild(previewContainer);
        wrapper.appendChild(textInput);
        wrapper.appendChild(controlsContainer);
        wrapper.appendChild(currentPath);
        if (this.help) {
            const helpText = document.createElement('small');
            helpText.className = 'image-input-help';
            helpText.innerHTML = this.help;
            wrapper.appendChild(helpText);
        }
        wrapper.appendChild(infoContainer);
        wrapper.appendChild(fileInput);

        // Store reference for later
        this.wrapper = wrapper;
        this.fileInput = fileInput;
        this.textInput = textInput;
        this.previewImg = wrapper.querySelector(`#${this.fieldId}-preview-img`);
        this.previewFallback = wrapper.querySelector(`#${this.fieldId}-preview-fallback`);
        this.errorMsg = errorMsg;
        this.suggestedPathDiv = suggestedPath;
        this.currentPathDiv = currentPath;
    }

    attachEventListeners() {
        // File selected
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Manual input change
        this.textInput.addEventListener('input', (e) => {
            this.updatePreview();
            if (this.onChange) this.onChange(e.target.value);
        });

        // Prevent form submission on button clicks
        this.wrapper.querySelectorAll('button[type="button"]').forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showError(validation.error);
            return;
        }

        // Clear previous errors
        this.clearError();

        // Enforce 350KB limit so base64 data URL stays under Firestore 1MB doc limit
        const maxBytes = 350 * 1024;
        if (file.size > maxBytes) {
            this.showError(`File too large for embedded storage: ${(file.size / 1024).toFixed(0)}KB. Max: 350KB`);
            return;
        }

        // Show suggested path
        this.suggestedPathDiv.innerHTML = `
            <div class="suggested-path-box">
                <p class="suggested-label">Suggested path:</p>
                <code>${suggestedPath}</code>
                <button type="button" class="btn btn-sm btn-primary" onclick="document.querySelector('#${this.fieldId}-input').value = '${suggestedPath}'; document.querySelector('#${this.fieldId}-input').dispatchEvent(new Event('input')); document.querySelector('#${this.fieldId}-suggested').style.display = 'none';">
                    Use This Path
                </button>
                <p class="suggested-hint" style="font-size: 0.75rem; color: #64748b; margin-top: 8px;">
                    ℹ️ Please upload the file to the <code>${this.extractFolder(suggestedPath)}</code> folder before deployment.
                </p>
            </div>
        `;
        this.suggestedPathDiv.style.display = 'block';

        // Read file as data URL and store it directly — no server upload needed
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.textInput.value = dataUrl;
            if (this.onChange) this.onChange(dataUrl);
            this.suggestedPathDiv.style.display = 'none';
            this.previewImg.src = dataUrl;
            this.previewImg.style.display = 'block';
            this.previewFallback.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    validateFile(file) {
        // Check extension
        const ext = file.name.split('.').pop().toLowerCase();
        if (!this.allowedTypes.includes(ext)) {
            return {
                valid: false,
                error: `Invalid file type: ${ext}. Allowed: ${this.allowedTypes.join(', ')}`
            };
        }

        // Check size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > this.maxSizeMB) {
            return {
                valid: false,
                error: `File too large: ${sizeMB.toFixed(2)}MB. Max: ${this.maxSizeMB}MB`
            };
        }

        return { valid: true };
    }

    generateSuggestedPath(filename) {
        // Extract base name and extension
        const parts = filename.split('.');
        const ext = parts.pop().toLowerCase();
        const baseName = parts.join('.').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Generate path: assets/{folder}/{filename}
        return `${this.suggestedFolder}/${baseName || 'image'}.${ext}`;
    }

    extractFolder(path) {
        const parts = path.split('/');
        parts.pop(); // Remove filename
        return parts.join('/');
    }

    updatePreview() {
        const value = this.textInput.value.trim();

        if (!value) {
            this.previewImg.style.display = 'none';
            this.previewFallback.style.display = 'flex';
            this.currentPathDiv.innerHTML = '';
            return;
        }

        // Show current path
        this.currentPathDiv.innerHTML = `
            <div class="current-path-info">
                <small style="color: #64748b;">Saved path:</small>
                <code>${value.startsWith('data:') ? 'Embedded image' : this.escapeHtml(value)}</code>
            </div>
        `;

        // If the stored value is a data URL, load it directly (embedded image)
        if (value.startsWith('data:')) {
            this.previewImg.src = value;
            this.previewImg.style.display = 'block';
            this.previewFallback.style.display = 'none';
            return;
        }

        // Try to load preview from the stored path
        const previewPath = this.normalizePathForPreview(value);
        this.previewImg.src = previewPath;
        this.previewImg.style.display = 'block';
        this.previewFallback.style.display = 'none';

        // Handle preview load error
        this.previewImg.onerror = () => {
            this.previewImg.style.display = 'none';
            this.previewFallback.innerHTML = `
                <i class="bi bi-exclamation-triangle"></i>
                <p>Preview unavailable</p>
                <small style="font-size: 0.75rem; color: #64748b;">Path: ${this.escapeHtml(value)}</small>
            `;
            this.previewFallback.style.display = 'flex';
        };
    }

    normalizePathForPreview(value) {
        // If already HTTPS, use as-is
        if (value.startsWith('https://') || value.startsWith('http://')) {
            return value;
        }

        // admin.html is at site root, so assets/ paths are correct as-is
        if (value.startsWith('assets/')) {
            return value;
        }

        if (value.startsWith('/assets/')) {
            return value.slice(1);
        }

        // Already relative with ../, keep as-is
        if (value.startsWith('../')) {
            return value;
        }

        return value;
    }

    showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
        this.fileInput.value = '';
    }

    clearError() {
        this.errorMsg.textContent = '';
        this.errorMsg.style.display = 'none';
    }

    clear() {
        this.textInput.value = '';
        this.fileInput.value = '';
        this.previewImg.src = '';
        this.previewImg.style.display = 'none';
        this.previewFallback.style.display = 'flex';
        this.previewFallback.innerHTML = `
            <i class="bi bi-image"></i>
            <p>No image selected</p>
        `;
        this.currentPathDiv.innerHTML = '';
        this.suggestedPathDiv.style.display = 'none';
        this.clearError();
        if (this.onChange) this.onChange('');
    }

    getValue() {
        return this.textInput.value.trim();
    }

    setValue(value) {
        this.textInput.value = value || '';
        this.updatePreview();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    render() {
        return this.wrapper;
    }

    insertBefore(element) {
        if (element && element.parentNode) {
            element.parentNode.insertBefore(this.wrapper, element);
        }
    }

    replaceElement(element) {
        if (element && element.parentNode) {
            element.parentNode.replaceChild(this.wrapper, element);
        }
    }
}
