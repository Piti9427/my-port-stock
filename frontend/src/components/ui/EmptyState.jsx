export function EmptyState({ icon = null, title, description = null, action = null, onAction = null }) {
  const actionLabel = typeof action === 'string' ? action : action?.label;
  const actionHandler = action && typeof action === 'object' ? action.onClick : onAction;

  return (
    <div className="empty-state ui-empty-state" role="status">
      {icon && (
        <div className="ui-empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="empty-title">{title}</div>
      {description && <div className="empty-copy">{description}</div>}
      {actionLabel && (
        <button className="btn-secondary ui-empty-state-action" type="button" onClick={actionHandler}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
