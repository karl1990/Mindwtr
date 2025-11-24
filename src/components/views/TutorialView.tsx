import React from 'react';
import { CheckCircle2, Inbox, Calendar, Layers, ListTodo, HelpCircle } from 'lucide-react';

export function TutorialView() {
    return (
        <div className="h-full overflow-y-auto p-8 max-w-4xl mx-auto">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Getting Things Done
                </h1>
                <p className="text-xl text-muted-foreground">
                    A guide to mastering your productivity with this application.
                </p>
            </header>

            <div className="space-y-12">
                <section>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Inbox className="w-6 h-6" />
                        </div>
                        1. Capture (Inbox)
                    </h2>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="mb-4 leading-relaxed">
                            The <strong>Inbox</strong> is your landing zone for everything. Don't worry about organizing yet—just get it out of your head.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                            <li>Use the "Add Task" button anywhere or go to the Inbox view.</li>
                            <li>Write down tasks, ideas, or reminders quickly.</li>
                            <li>Aim to empty your head completely.</li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                            <ListTodo className="w-6 h-6" />
                        </div>
                        2. Clarify & Organize
                    </h2>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="mb-4 leading-relaxed">
                            Process your Inbox regularly. For each item, decide what it is and where it belongs.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h3 className="font-medium">Actionable?</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><span className="font-semibold text-foreground">Next Actions:</span> Do it as soon as possible.</li>
                                    <li><span className="font-semibold text-foreground">Projects:</span> Multi-step outcomes.</li>
                                    <li><span className="font-semibold text-foreground">Waiting For:</span> Delegated to someone else.</li>
                                    <li><span className="font-semibold text-foreground">Calendar:</span> Must be done on a specific day.</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-medium">Not Actionable?</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><span className="font-semibold text-foreground">Someday/Maybe:</span> Ideas for the future.</li>
                                    <li><span className="font-semibold text-foreground">Reference:</span> Keep for info (add to notes).</li>
                                    <li><span className="font-semibold text-foreground">Trash:</span> Delete it.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        3. Reflect (Weekly Review)
                    </h2>
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <p className="mb-4 leading-relaxed">
                            The <strong>Weekly Review</strong> is critical. It keeps your system trusted and current.
                        </p>
                        <p className="text-muted-foreground mb-4">
                            Go to the "Weekly Review" tab to start a guided wizard that will help you:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                            <li>Clear your mind and inbox.</li>
                            <li>Review your calendar (past and upcoming).</li>
                            <li>Follow up on "Waiting For" items.</li>
                            <li>Review Project lists and "Someday/Maybe" items.</li>
                        </ol>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                            <Layers className="w-6 h-6" />
                        </div>
                        App Features
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2">Contexts</h3>
                            <p className="text-sm text-muted-foreground">
                                Use <strong>@tags</strong> (e.g., @home, @work) to filter tasks by where you are or what tool you need.
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2">Projects</h3>
                            <p className="text-sm text-muted-foreground">
                                Group related tasks into Projects. Give them colors to easily distinguish them.
                            </p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2">Kanban Board</h3>
                            <p className="text-sm text-muted-foreground">
                                Visualize your workflow. Drag and drop tasks between states (Next, Waiting, Done).
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
