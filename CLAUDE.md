# BookMarkDown - Development Rules & Guidelines

## React State Usage Rules

### ✅ Rule: React State should only be used for UI display
**React State は UI の表示以外に使わない**

React state should **ONLY** be used for:
- UI rendering and display
- Component visual state (collapsed/expanded, loading states, etc.)
- Triggering re-renders when data changes

### ❌ Prohibited: React State for Business Logic
React state should **NEVER** be used for:
- Business logic validation
- Data existence checks
- Drop/drag operation validation
- Data traversal and filtering
- Any logic that affects application behavior

### Correct Implementation Pattern

#### ❌ Wrong (React state for business logic):
```typescript
// DraggableBookmark.tsx - WRONG
canDrag: () => {
  const category = bookmarkContext.root.categories.find(cat => cat.name === categoryName);
  const bundle = category?.bundles.find(b => b.name === bundleName);
  const bookmarkExists = bundle?.bookmarks.some(b => b.id === bookmark.id);
  return bookmarkExists || false;
}
```

#### ✅ Correct (Service state for business logic):
```typescript
// DraggableBookmark.tsx - CORRECT
canDrag: () => {
  return bookmarkContext.canDragBookmark(categoryName, bundleName, bookmark.id);
}
```

### Architecture Pattern

```
Service State (Source of Truth)
    ↓ (one-way data flow)
React State (UI Display)
    ↓ (render)
UI Components
```

**Service State** = Single Source of Truth for all business logic
**React State** = Display layer only, updated from Service State

### Service Methods for Business Logic

All business logic should use these service methods:

```typescript
// Business logic operations (implemented in BookmarkService)
canDragBookmark(categoryName: string, bundleName: string, bookmarkId: string): boolean
canDropBookmark(item: DragItem, targetCategory: string, targetBundle: string): boolean
canDropBundle(bundleName: string, fromCategory: string, toCategory: string): boolean
getSourceBundle(categoryName: string, bundleName: string): Bundle | null
hasCategories(): boolean
getCategories(): readonly Category[]
```

### Benefits of This Pattern

1. **Single Source of Truth**: Service state is always authoritative
2. **State Consistency**: No React state synchronization issues
3. **Predictable Behavior**: Business logic is centralized
4. **Easier Debugging**: Clear separation of concerns
5. **Bug Prevention**: Avoids state synchronization races

### Common Violations to Avoid

1. **Using `bookmarkContext.root` for validation**
2. **Using `bookmark.root.categories` for business logic**
3. **Direct React state access in drag/drop operations**
4. **Data existence checks using React state**
5. **Filtering or searching using React state**

### Fixed Files

These files have been updated to follow the rules:
- `DraggableBookmark.tsx` - Now uses service methods for canDrag
- `DroppableBundle.tsx` - Now uses service methods for canDrop and drop logging
- `DroppableCategory.tsx` - Now uses service methods for canDrop
- `BookmarksPage.tsx` - Now uses service methods for data display
- `useBookmarkContextProvider.ts` - Now uses service state for logging

## Additional Development Guidelines

### Code Organization
- Keep business logic in the service layer
- Use React components only for UI presentation
- Delegate all data operations to service methods

### Error Handling
- Service methods should handle all business logic errors
- React components should only handle UI-related errors
- Use consistent error logging patterns

### Testing
- Test business logic at the service layer
- Test UI behavior at the component layer
- Avoid testing business logic through React state

---

**Remember**: React State is for UI display only. All business logic must use Service State.