class GiftGuide extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('[data-gift-dialog]');
    this.form = this.querySelector('[data-gift-form]');
    this.activeProduct = null;

    this.querySelectorAll('[data-gift-card]').forEach((card) => {
      card.addEventListener('click', () => this.openProduct(card));
    });

    this.querySelector('[data-gift-close]')?.addEventListener('click', () => this.dialog.close());
    this.dialog?.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });
    this.form?.addEventListener('change', () => this.updateVariant());
    this.form?.addEventListener('click', (event) => this.handleOptionClick(event));
    this.form?.addEventListener('submit', (event) => this.addToCart(event));
  }

  openProduct(card) {
    this.activeProduct = JSON.parse(card.dataset.product);
    const product = this.activeProduct;
    this.querySelector('[data-gift-image]').src = product.image || '';
    this.querySelector('[data-gift-image]').alt = product.title;
    this.querySelector('[data-gift-title]').textContent = product.title;
    this.querySelector('[data-gift-description]').textContent = product.description || '';

    const options = this.querySelector('[data-gift-options]');
    const displayOptions = [...product.options].sort((first, second) => {
      const firstIsColor = first.name.toLowerCase() === 'color' || first.name.toLowerCase() === 'colour';
      const secondIsColor = second.name.toLowerCase() === 'color' || second.name.toLowerCase() === 'colour';
      return Number(secondIsColor) - Number(firstIsColor);
    });
    options.innerHTML = displayOptions.map((option) => {
      const index = product.options.indexOf(option);
      const isColor = option.name.toLowerCase() === 'color' || option.name.toLowerCase() === 'colour';
      if (isColor) {
        return `<div class="gift-modal__option gift-modal__option--color">
          <span class="gift-modal__label">${this.escape(option.name)}</span>
          <div class="gift-modal__swatches" role="radiogroup" aria-label="${this.escape(option.name)}">
            ${option.values.map((value) => `<label class="gift-modal__swatch" style="--gift-swatch-accent: ${this.colorAccent(value)}">
              <input type="radio" name="GiftOption-${index}" data-option-index="${index}" value="${this.escape(value)}">
              <span>${this.escape(value)}</span>
            </label>`).join('')}
          </div>
        </div>`;
      }

      return `<div class="gift-modal__option">
        <span class="gift-modal__label">${this.escape(option.name)}</span>
        <div class="gift-modal__select-wrap" data-gift-select>
          <button class="gift-modal__select" type="button" data-option-toggle data-option-index="${index}" aria-expanded="false">
            <span data-option-value>Choose your ${this.escape(option.name.toLowerCase())}</span>
          </button>
          <div class="gift-modal__option-list" data-option-list hidden>
            ${option.values.map((value) => `<button type="button" data-option-choice data-option-index="${index}" value="${this.escape(value)}">${this.escape(value)}</button>`).join('')}
          </div>
        </div>
      </div>`;
    }).join('');
    this.updateVariant();
    this.dialog.showModal();
  }

  updateVariant() {
    if (!this.activeProduct) return;
    const selected = this.activeProduct.options.map((option, index) => {
      const control = this.querySelector(`[data-option-index="${index}"]:checked`) || this.querySelector(`[data-option-toggle][data-option-index="${index}"]`);
      return control?.dataset.value || control?.value;
    });
    const variant = selected.includes(undefined)
      ? null
      : this.activeProduct.variants.find((item) => item.options.every((value, index) => value === selected[index]));
    this.variant = variant;
    this.querySelector('[data-gift-price]').textContent = variant?.price || this.activeProduct.variants[0]?.price || '';
    const button = this.querySelector('[data-gift-submit]');
    if (!variant) {
      button.disabled = true;
      return;
    }
    button.disabled = !variant?.available;
    button.textContent = variant.available ? 'ADD TO CART  →' : 'SOLD OUT';
  }

  handleOptionClick(event) {
    const toggle = event.target.closest('[data-option-toggle]');
    if (toggle) {
      const list = toggle.parentElement.querySelector('[data-option-list]');
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      this.querySelectorAll('[data-option-toggle]').forEach((item) => {
        item.setAttribute('aria-expanded', 'false');
        item.parentElement.querySelector('[data-option-list]').hidden = true;
      });
      toggle.setAttribute('aria-expanded', String(!isOpen));
      list.hidden = isOpen;
      return;
    }

    const choice = event.target.closest('[data-option-choice]');
    if (!choice) return;
    const toggleButton = this.querySelector(`[data-option-toggle][data-option-index="${choice.dataset.optionIndex}"]`);
    toggleButton.dataset.value = choice.value;
    toggleButton.querySelector('[data-option-value]').textContent = choice.value;
    toggleButton.setAttribute('aria-expanded', 'false');
    choice.parentElement.hidden = true;
    this.updateVariant();
  }

  async addToCart(event) {
    event.preventDefault();
    if (!this.variant?.available) return;
    const error = this.querySelector('[data-gift-error]');
    const button = this.querySelector('[data-gift-submit]');
    button.disabled = true;
    error.textContent = '';

    const items = [{ id: this.variant.id, quantity: 1 }];
    const selectedValues = this.variant.options.map((value) => value.toLowerCase());
    const winterVariant = this.winterVariant;
    if (selectedValues.includes('black') && selectedValues.includes('medium') && winterVariant?.available) {
      items.push({ id: winterVariant.id, quantity: 1 });
    }

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!response.ok) throw new Error('Unable to add this product to the cart.');
      this.dialog.close();
      window.location.assign(window.Shopify.routes.root + 'cart');
    } catch (exception) {
      error.textContent = exception.message;
      button.disabled = false;
    }
  }

  get winterVariant() {
    const raw = this.dataset.winterProduct;
    if (!raw) return null;
    return JSON.parse(raw).variants.find((variant) => variant.available);
  }

  colorAccent(value) {
    const accents = { blue: '#2460a7', red: '#a21038', grey: '#a7a7a7', gray: '#a7a7a7', white: '#111111', black: '#111111' };
    return accents[value.toLowerCase()] || '#111111';
  }

  escape(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }
}

customElements.define('gift-guide', GiftGuide);
