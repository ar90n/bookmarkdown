import { createBookmarkApp } from './dist/index.js';

// Example usage of BookMarkDown with functional architecture
async function example() {
  console.log('BookMarkDown Functional Example');
  console.log('===============================');

  // Create a new bookmark service
  const service = createBookmarkApp();

  // Add a category
  const categoryResult = service.addCategory('Development Tools');
  if (categoryResult.success) {
    console.log('Added category: Development Tools');
  } else {
    console.error('Failed to add category:', categoryResult.error.message);
    return;
  }

  // Add a bundle to the category
  const bundleResult = service.addBundle('Development Tools', 'Terminal');
  if (bundleResult.success) {
    console.log('Added bundle: Terminal');
  } else {
    console.error('Failed to add bundle:', bundleResult.error.message);
    return;
  }

  // Add some bookmarks
  const bookmark1Result = service.addBookmark('Development Tools', 'Terminal', {
    title: 'iTerm2',
    url: 'https://iterm2.com/',
    tags: ['mac', 'terminal'],
    notes: 'Split pane is convenient'
  });

  const bookmark2Result = service.addBookmark('Development Tools', 'Terminal', {
    title: 'Oh My Zsh',
    url: 'https://ohmyz.sh/',
    tags: ['zsh', 'shell', 'productivity'],
    notes: 'Framework for managing zsh configuration'
  });

  if (bookmark1Result.success && bookmark2Result.success) {
    console.log('Added bookmarks: iTerm2, Oh My Zsh');
  }

  // Add another bundle
  const editorBundleResult = service.addBundle('Development Tools', 'Editors');
  const bookmark3Result = service.addBookmark('Development Tools', 'Editors', {
    title: 'VSCode',
    url: 'https://code.visualstudio.com/',
    tags: ['ide', 'editor'],
    notes: 'GitHub Copilot support'
  });

  if (editorBundleResult.success && bookmark3Result.success) {
    console.log('Added bookmark to editors: VSCode');
  }

  // Search bookmarks
  const searchResults = service.searchBookmarks({ searchTerm: 'terminal' });
  console.log('Search results for "terminal":', searchResults.length);

  // Get statistics
  const stats = service.getStats();
  console.log('Statistics:', stats);

  // Export the root data structure for inspection
  const rootData = service.getRoot();
  console.log('\\nGenerated data structure:');
  console.log(JSON.stringify(rootData, null, 2));

  console.log('\\nFunctional example completed successfully!');
  console.log('\\nKey differences in functional architecture:');
  console.log('- Immutable data structures');
  console.log('- Pure functions in core');
  console.log('- Result types for error handling');
  console.log('- Separation of functional core and imperative shell');
}

// Run the example
example().catch(console.error);