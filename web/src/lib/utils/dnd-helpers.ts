/**
 * Calculate the drop index based on mouse position relative to container
 * @param container The container element containing the draggable items
 * @param clientOffset The mouse position from react-dnd
 * @param itemCount The total number of items in the container
 * @returns The index where the item should be inserted
 */
export function calculateDropIndex(
  container: HTMLElement,
  clientOffset: { x: number; y: number },
  itemCount: number
): number {
  const containerRect = container.getBoundingClientRect();
  const relativeY = clientOffset.y - containerRect.top;
  
  // Get all bookmark items within the container
  const items = container.querySelectorAll('[data-bookmark-item]');
  
  if (items.length === 0) {
    return 0;
  }
  
  // Find the index based on mouse position
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as HTMLElement;
    const itemRect = item.getBoundingClientRect();
    const itemMiddle = itemRect.top + itemRect.height / 2;
    
    if (clientOffset.y < itemMiddle) {
      return i;
    }
  }
  
  // If we're below all items, return the last position
  return itemCount;
}

/**
 * Calculate the drop index for category reordering
 */
export function calculateCategoryDropIndex(
  container: HTMLElement,
  clientOffset: { x: number; y: number },
  categoryCount: number
): number {
  const containerRect = container.getBoundingClientRect();
  const relativeY = clientOffset.y - containerRect.top;
  
  // Get all category items within the container
  const categories = container.querySelectorAll('[data-category-item]');
  
  if (categories.length === 0) {
    return 0;
  }
  
  // Find the index based on mouse position
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i] as HTMLElement;
    const categoryRect = category.getBoundingClientRect();
    const categoryMiddle = categoryRect.top + categoryRect.height / 2;
    
    if (clientOffset.y < categoryMiddle) {
      return i;
    }
  }
  
  // If we're below all categories, return the last position
  return categoryCount;
}

/**
 * Calculate the drop index for bundle reordering within a category
 */
export function calculateBundleDropIndex(
  container: HTMLElement,
  clientOffset: { x: number; y: number },
  bundleCount: number
): number {
  const containerRect = container.getBoundingClientRect();
  const relativeY = clientOffset.y - containerRect.top;
  
  // Get all bundle items within the container
  const bundles = container.querySelectorAll('[data-bundle-item]');
  
  if (bundles.length === 0) {
    return 0;
  }
  
  // Find the index based on mouse position
  for (let i = 0; i < bundles.length; i++) {
    const bundle = bundles[i] as HTMLElement;
    const bundleRect = bundle.getBoundingClientRect();
    const bundleMiddle = bundleRect.top + bundleRect.height / 2;
    
    if (clientOffset.y < bundleMiddle) {
      return i;
    }
  }
  
  // If we're below all bundles, return the last position
  return bundleCount;
}