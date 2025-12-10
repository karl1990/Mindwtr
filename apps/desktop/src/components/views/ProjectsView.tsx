import { useState } from 'react';
import { useTaskStore } from '@focus-gtd/core';
import { TaskItem } from '../TaskItem';
import { Plus, Folder, Trash2, ListOrdered, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/language-context';
import { confirm } from '@tauri-apps/plugin-dialog';

export function ProjectsView() {
    const { projects, tasks, addProject, updateProject, deleteProject, addTask } = useTaskStore();
    const { t } = useLanguage();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectColor, setNewProjectColor] = useState('#3b82f6'); // Default blue
    const [notesExpanded, setNotesExpanded] = useState(false);

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProjectTitle.trim()) {
            addProject(newProjectTitle, newProjectColor);
            setNewProjectTitle('');
            setIsCreating(false);
        }
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const projectTasks = selectedProjectId
        ? tasks.filter(t => t.projectId === selectedProjectId && t.status !== 'done' && !t.deletedAt)
        : [];

    return (
        <div className="flex h-full gap-6">
            {/* Sidebar List of Projects */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4 border-r border-border pr-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">{t('projects.title')}</h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1 hover:bg-accent rounded-md transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreateProject} className="bg-card border border-border rounded-lg p-3 space-y-3 animate-in slide-in-from-top-2">
                        <input
                            autoFocus
                            type="text"
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            placeholder={t('projects.projectName')}
                            className="w-full bg-transparent border-b border-primary/50 p-1 text-sm focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={newProjectColor}
                                onChange={(e) => setNewProjectColor(e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="text-xs text-muted-foreground">{t('projects.color')}</span>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="text-xs px-2 py-1 hover:bg-muted rounded"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
                            >
                                {t('projects.create')}
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-1 overflow-y-auto flex-1">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm",
                                selectedProjectId === project.id ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                            )}
                        >
                            <Folder className="w-4 h-4" style={{ color: project.color }} />
                            <span className="flex-1 truncate">{project.title}</span>
                            <span className="text-xs text-muted-foreground">
                                {tasks.filter(t => t.projectId === project.id && t.status !== 'done' && !t.deletedAt).length}
                            </span>
                        </div>
                    ))}

                    {projects.length === 0 && !isCreating && (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            {t('projects.noProjects')}
                        </div>
                    )}
                </div>
            </div>

            {/* Project Details & Tasks */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {selectedProject ? (
                    <>
                        <header className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                                <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Sequential Toggle */}
                                <button
                                    type="button"
                                    onClick={() => updateProject(selectedProject.id, { isSequential: !selectedProject.isSequential })}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                        selectedProject.isSequential
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                    )}
                                    title={selectedProject.isSequential ? "Sequential: Only first task shows in Next Actions" : "Parallel: All tasks show in Next Actions"}
                                >
                                    <ListOrdered className="w-4 h-4" />
                                    {selectedProject.isSequential ? 'Sequential' : 'Parallel'}
                                </button>
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        const confirmed = await confirm(t('projects.deleteConfirm'), {
                                            title: t('projects.title'),
                                            kind: 'warning'
                                        });
                                        if (confirmed) {
                                            deleteProject(selectedProject.id);
                                            setSelectedProjectId(null);
                                        }
                                    }}
                                    className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </header>

                        <div className="mb-6 border rounded-lg overflow-hidden bg-card">
                            <button
                                onClick={() => setNotesExpanded(!notesExpanded)}
                                className="w-full flex items-center gap-2 p-2 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium"
                            >
                                {notesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                Project Notes
                            </button>
                            {notesExpanded && (
                                <div className="p-0">
                                    <textarea
                                        className="w-full min-h-[120px] p-3 text-sm bg-transparent border-none resize-y focus:outline-none focus:bg-accent/5"
                                        placeholder="Add context, plans, or reference notes for this project..."
                                        defaultValue={selectedProject.supportNotes || ''}
                                        onBlur={(e) => updateProject(selectedProject.id, { supportNotes: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const input = form.elements.namedItem('taskTitle') as HTMLInputElement;
                                    if (input.value.trim()) {
                                        addTask(input.value, { projectId: selectedProject.id, status: 'todo' });
                                        input.value = '';
                                    }
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    name="taskTitle"
                                    type="text"
                                    placeholder={t('projects.addTaskPlaceholder')}
                                    className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button
                                    type="submit"
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    {t('projects.addTask')}
                                </button>
                            </form>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {projectTasks.length > 0 ? (
                                projectTasks.map(task => (
                                    <TaskItem key={task.id} task={task} />
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-12">
                                    {t('projects.noActiveTasks')}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Folder className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>{t('projects.selectProject')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

