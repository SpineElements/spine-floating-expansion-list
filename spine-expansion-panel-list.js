/*
 * Copyright (c) 2000-2018 TeamDev. All rights reserved.
 * TeamDev PROPRIETARY and CONFIDENTIAL.
 * Use is subject to license terms.
 */

import {render} from 'lit-html/lit-html.js';
import {LitElement, html} from '@polymer/lit-element';
import '@polymer/paper-styles/shadow.js';

/**
 * An element that displays an associated array of items as a list of panels showing a summary view
 * for each item, and allows expanding any item to display a full item view.
 *
 * You can specify the template for the content that should be displayed for each item in the nested
 * `template` element. This template will be stamped for each of the provided items with a different
 * value of the `item` variable, which can be used inside the template's elements to refer to the
 * respective item object.
 *
 * A template for an expanded item can be specified using an additional nested `template` element
 * with `class="expanded"` attribute.
 *
 * Example:
 * ```
 * <spine-expansion-panel-list
 *     items="${attachments}"
 *
 *     collapsedItemRenderer="${item => html`
 *       <div>Name: ${item.name}</div>
 *       <div>Size: ${item.size}</div>
 *     `}"
 *
 *     expandedItemRenderer="${item => html`
 *       <div>Name: ${item.name}</div>
 *       <img src="${item.imageUrl}">
 *     `}">
 * </spine-expansion-panel-list>
 * ```
 *
 * This element dispatches the non-bubbling `expanded-item-changed` event when the expanded item is
 * changed. You can read the `event.detail.expandedItem` property from the dispatched `event` to
 * detect which item has been expanded (will be `null` if no items are expanded).
 *
 * ### Styling
 *
 * The templates provided are stamped in the light DOM of the `spine-expansion-panel-list` element,
 * so regular CSS declarations in your element will be applicable to the item elements rendered with
 * these templates. `spine-expansion-panel-list` renders some intermediate container elements as
 * containers of the actual stamped templates, which is considered as an implementation details, and
 * these elements shouldn't be relied upon in your CSS declarations.
 *
 * You can use the following custom CSS properties and mixins:
 *
 * Custom property/mixin                         | Description                                    | Default
 * ----------------------------------------------|------------------------------------------------|----------
 * `--spine-expansion-panel-list-item`           | Mixin applied to all list item containers      | `{}`
 * `--spine-expansion-panel-list-expanded-item`  | Mixin applied to expanded list item containers | `{}`
 * `--spine-expansion-panel-list-expansion-size` | Size by which an expanded item's left/right edges stand out relative to the side edges of collapsed items | `20px`
 *
 */
class SpineFloatingExpansionList extends LitElement {
  static get properties() {
    return {
      items: Array,
      expandedItem: Object,
      renderCollapsedItem: Function,
      renderExpandedItem: Function
    }
  }

  constructor() {
    super();
    this.expandedItem = null;
    this.items = [];
    this._handleDocumentClick = this._handleDocumentClick.bind(this);
  }

  _render(props) {
    return html`
      <style>
        :host {
          display: block;
  
          ---spine-epl-divider-color: rgba(0, 0, 0, var(--dark-divider-opacity, 0.12));
        }
  
        #container ::slotted(.-spine-expansion-panel--list-item) {
          margin: 0 var(--spine-expansion-panel-list-expansion-size, 20px);
          @apply --shadow-elevation-2dp;
          background: var(--primary-background-color, #ffffff);
          color: var(--primary-text-color, #000000);
          padding: 8px 16px;
          cursor: pointer;
          transition: all 5.2s;
  
          @apply --spine-expansion-panel-list-item;
          overflow: hidden;
        }
  
        #container ::slotted(.-spine-expansion-panel--list-item:not([expanded]):not([ends-collapsed-range])) {
          border-bottom: 1px solid var(---spine-epl-divider-color);
        }
  
        #container ::slotted(.-spine-expansion-panel--list-item[expanded]) {
          margin: 16px 0;
          @apply --shadow-elevation-8dp;
  
          cursor: default;
  
          @apply --spine-expansion-panel-list-expanded-item;
        }
      </style>
  
      <div id="container">
        <slot></slot>
      </div>    
    `;
  }

  /**
   * Similar to `_render`, but renders content that should be placed in an element's light DOM.
   *
   * The item elements, with their respective custom content templates that have been provided via
   * `renderCollapsedItem` and `renderExpandedItem` properties, have to be rendered into element's
   * light DOM and not shadow DOM.
   *
   * This is needed for their style to be customizable with CSS declarations present in the
   * context where the `spine-expansion-panel-list` element is used.
   */
  _renderLightDOM({items, expandedItem, renderCollapsedItem, renderExpandedItem}) {
    return html`${
        items.map(item => html`
        <div class="-spine-expansion-panel--list-item" 
             expanded?="${(item === expandedItem)}" 
             ends-collapsed-range?="${this._getItemEndsCollapsedRange(item)}" 
             on-click="${e => this._handleItemClick(item)}">
          <div class="-spine-expansion-panel--list-item-content">
            <!--
              The "overflow: hidden" style is added below to prevent collapsing the stamper
              children's margins, e.g. if <h2> is placed as the first template's tag,
              see this approach here: https://stackoverflow.com/a/19719427
              This is needed for a proper "height: auto" animation in
              the \`_handleExpandedItemChange\` method.

              Inplace style is used instead of a dedicated CSS rule since this template is
              rendered in the element's light DOM (not shadow DOM), and the ::slotted CSS
              selector can target only top-level slot nodes, as noted here:
              https://developers.google.com/web/fundamentals/web-components/shadowdom#stylinglightdom
            -->
            <div style="overflow: hidden">${
            item !== expandedItem || !this.renderExpandedItem
                ? renderCollapsedItem(item)
                : renderExpandedItem(item)
            }</div>
          </div>
        </div>
      `)
        }`;
  }

  /**
   * @override
   */
  _applyRender(result, node) {
    // render shadow DOM tree
    super._applyRender(result, node);

    // render light DOM tree
    const {items, expandedItem, renderCollapsedItem, renderExpandedItem} = this;
    const lightDOMTemplateResult = this._renderLightDOM(
        {items, expandedItem, renderCollapsedItem, renderExpandedItem}
    );
    render(lightDOMTemplateResult, this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleDocumentClick);
  }

  _propertiesChanged(props, changedProps, oldProps) {
    const invokeSuperPropertiesChanged = () => {
      super._propertiesChanged(props, changedProps, oldProps);
    };
    if (changedProps && changedProps.expandedItem !== undefined) {
      this._handleExpandedItemChange(oldProps.expandedItem, invokeSuperPropertiesChanged);
    } else {
      invokeSuperPropertiesChanged();
    }
  }

  /**
   * @param {Object} item          an item to be tested
   * @param {Object} expandedItem  the current expanded item
   * @return {boolean} `true` if item specified by the `item` parameter is the last one in a series
   *                          of consecutive collapsed items (e.g. a last item or an item before an
   *                          expanded one)
   * @private
   */
  _getItemEndsCollapsedRange(item, expandedItem) {
    const itemIndex = this.items.indexOf(item);
    if (itemIndex === -1) {
      return false;
    }

    if (itemIndex === this.items.length - 1) {
      return true;
    }

    const expandedItemIndex = this.items.indexOf(expandedItem);
    if (expandedItemIndex === -1) {
      return false;
    }
    return itemIndex === expandedItemIndex - 1;
  }

  /**
   * This function is invoked when the `expandedItem` property is changed. It ensures that item
   * heights are animated properly for both old and new expanded items without quick "jumps" in
   * heights.
   *
   * A component is in the following state when this method is invoked:
   * - the `expandedItem` property contains a new value;
   * - a component's UI hasn't been rendered in response to a property change yet: an implementation
   *   of this method is responsible of invoking the `renderUpdatedUI` function passed to it to
   *   render the updated UI accordingly.
   *
   * @param {Object}   prevExpandedItem  A previous value of the `expandedItem` property.
   * @param {Function} renderUpdatedUI   A function that synchronously applies rendering according
   *                                     to the pending property updates (that include an updated
   *                                     `expandedItem` property).
   * @private
   */
  _handleExpandedItemChange(prevExpandedItem, renderUpdatedUI) {
    const setItemHeightByContentHeight = itemElement => {
      const itemContentElement = this._getItemContentElement(itemElement);
      itemElement.style.height = `${itemContentElement.offsetHeight}px`;
    };
    const setItemHeightAuto = itemElement => {
      itemElement.style.height = 'auto';
    };

    const prevExpandedElement = this._getItemElement(prevExpandedItem);
    const newExpandedElement = this._getItemElement(this.expandedItem);
    const itemHeightsToAnimate = [prevExpandedElement, newExpandedElement].filter(el => el);

    // we need to set the fixed initial item heights instead of 'auto' values in order for
    // the height transition animation to work (which doesn't work with 'auto' values)
    itemHeightsToAnimate.forEach(setItemHeightByContentHeight);

    renderUpdatedUI();

    // start the height transition animation by setting height to match the updated (expanded or
    // collapsed) content height
    itemHeightsToAnimate.forEach(setItemHeightByContentHeight);

    // when animation completes, reset item heights from fixed values back to 'auto' for any
    // subsequent height changes that might occur dynamically are not ignored (e.g. if item content
    // changes dynamically after this)
    const transitionDuration =
        this.constructor.__getElementTransitionDuration(itemHeightsToAnimate[0]);
    setTimeout(() => {
      itemHeightsToAnimate.forEach(setItemHeightAuto);
    }, transitionDuration);
  }

  /**
   * @return {NodeList} a [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList)
   *                    containing all of the item elements currently displayed by this component
   */
  _getItemElements() {
    return this.querySelectorAll('.-spine-expansion-panel--list-item');
  }

  /**
   * @param {Object} item  an item object, as found in the `items` array, whose element should be
   *                       located
   * @return {Element|undefined} an element that displays the provided item, or `undefined` if the
   *                             passed item is not in the current list of items
   */
  _getItemElement(item) {
    const itemElements = this._getItemElements();
    return itemElements[this.items.indexOf(item)];
  }

  /**
   * @param {Element} itemElement
   * @return {Element}
   */
  _getItemContentElement(itemElement) {
    return itemElement.querySelector('.-spine-expansion-panel--list-item-content');
  }

  /**
   * Takes the current value of element's `transition-duration` property and returns a respective
   * duration value in milliseconds if present, or 0 otherwise.
   *
   * @param {Element} element an element to be analyzed
   * @return {number} a transition duration value in milliseconds
   * @private
   */
  static __getElementTransitionDuration(element) {
    if (!element) {
      return 0;
    }
    const transitionDuration = getComputedStyle(element)['transition-duration'];
    if (!transitionDuration) {
      return 0;
    }
    if (transitionDuration.endsWith('ms')) {
      return parseInt(transitionDuration);
    } else if (transitionDuration.endsWith('s')) {
      return parseFloat(transitionDuration) * 1000;
    } else {
      throw new Error(`Couldn't parse transition-duration value: ${transitionDuration}`);
    }
  }

  _setExpandedItem(item) {
    this.expandedItem = item;
    this.dispatchEvent(new CustomEvent('expanded-item-changed', {
      detail: {
        expandedItem: item
      }
    }));
  }

  _handleItemClick(item) {
    this._setExpandedItem(item);
  }

  _handleDocumentClick(event) {
    if (event.composedPath().some(el =>
        el !== this && el instanceof Node && this.contains(el)
    )) {
      // one of the items was clicked, no auto collapsing is required
      return;
    }
    this._setExpandedItem(null);
  }
}

window.customElements.define('spine-expansion-panel-list', SpineFloatingExpansionList);
