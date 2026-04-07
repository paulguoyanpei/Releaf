import type { ContextScope } from '../../types/overleaf';
import { getProjectId, KEYS } from '../../utils/storage-keys';

interface Props {
  scope: ContextScope;
  onChange: (scope: ContextScope) => void;
}

export function ContextToggle({ scope, onChange }: Props) {
  const handleChange = (newScope: ContextScope) => {
    onChange(newScope);
    const projectId = getProjectId();
    if (projectId) {
      chrome.storage.local.set({ [KEYS.contextScope(projectId)]: newScope });
    }
  };

  return (
    <div className="context-toggle">
      <button
        className={`context-option ${scope === 'current-file' ? 'active' : ''}`}
        onClick={() => handleChange('current-file')}
      >
        Current file
      </button>
      <button
        className={`context-option ${scope === 'full-project' ? 'active' : ''}`}
        onClick={() => handleChange('full-project')}
      >
        Full project
      </button>
    </div>
  );
}
