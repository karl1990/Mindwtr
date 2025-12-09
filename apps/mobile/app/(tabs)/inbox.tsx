import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskStore, Task, TaskStatus } from '@focus-gtd/core';
import { TaskList } from '@/components/task-list';
import { useTheme } from '../../contexts/theme-context';
import { useLanguage } from '../../contexts/language-context';
import { Colors } from '@/constants/theme';

// GTD preset contexts
const PRESET_CONTEXTS = ['@home', '@work', '@errands', '@agendas', '@computer', '@phone', '@anywhere'];

export default function InboxScreen() {
  const router = useRouter();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [processingTask, setProcessingTask] = useState<Task | null>(null);
  const [processingStep, setProcessingStep] = useState<'actionable' | 'twomin' | 'decide' | 'context'>('actionable');
  const [newContext, setNewContext] = useState('');

  const tc = {
    bg: isDark ? Colors.dark.background : Colors.light.background,
    cardBg: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? Colors.dark.text : Colors.light.text,
    secondaryText: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
  };

  const inboxTasks = tasks.filter(t => t.status === 'inbox');

  const startProcessing = (task: Task) => {
    setProcessingTask(task);
    setProcessingStep('actionable');
  };

  const handleNotActionable = (action: 'trash' | 'someday' | 'reference') => {
    if (!processingTask) return;

    if (action === 'trash') {
      deleteTask(processingTask.id);
    } else if (action === 'someday') {
      updateTask(processingTask.id, { status: 'someday' });
    }
    // Reference would go to a reference system (future feature)
    setProcessingTask(null);
  };

  const handleActionable = () => {
    setProcessingStep('twomin');
  };

  const handleTwoMinYes = () => {
    // Do it now - mark done
    if (processingTask) {
      updateTask(processingTask.id, { status: 'done' });
    }
    setProcessingTask(null);
  };

  const handleTwoMinNo = () => {
    setProcessingStep('decide');
  };

  const handleDecision = (decision: 'delegate' | 'defer') => {
    if (!processingTask) return;

    if (decision === 'delegate') {
      updateTask(processingTask.id, { status: 'waiting' });
      setProcessingTask(null);
    } else {
      setProcessingStep('context');
    }
  };

  const handleSetContext = (context: string | null) => {
    if (!processingTask) return;

    const contexts = context ? [context] : [];
    updateTask(processingTask.id, {
      status: 'next',
      contexts
    });
    setProcessingTask(null);
  };

  const renderProcessingModal = () => (
    <Modal
      visible={processingTask !== null}
      animationType="slide"
      transparent
      onRequestClose={() => setProcessingTask(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: tc.cardBg }]}>
          <Text style={[styles.modalTitle, { color: tc.text }]}>
            📋 {t('inbox.title')}
          </Text>

          {processingTask && (
            <View style={[styles.taskPreview, { backgroundColor: tc.border }]}>
              <Text style={[styles.taskPreviewText, { color: tc.text }]}>
                {processingTask.title}
              </Text>
            </View>
          )}

          {processingStep === 'actionable' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepQuestion, { color: tc.text }]}>
                {t('inbox.isActionable')}
              </Text>
              <Text style={[styles.stepHint, { color: tc.secondaryText }]}>
                {t('inbox.actionableHint')}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleActionable}
                >
                  <Text style={styles.buttonPrimaryText}>✅ {t('inbox.yes')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: tc.border }]}
                  onPress={() => { }}
                >
                  <Text style={[styles.buttonText, { color: tc.text }]}>❌ {t('inbox.no')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.subLabel, { color: tc.secondaryText }]}>
                {t('inbox.no')}:
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleNotActionable('trash')}
                >
                  <Text style={styles.smallButtonText}>🗑️ {t('inbox.trash')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => handleNotActionable('someday')}
                >
                  <Text style={styles.smallButtonText}>💭 {t('inbox.someday')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {processingStep === 'twomin' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepQuestion, { color: tc.text }]}>
                ⏱️ {t('inbox.twoMinRule')}
              </Text>
              <Text style={[styles.stepHint, { color: tc.secondaryText }]}>
                {t('inbox.twoMinHint')}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSuccess]}
                  onPress={handleTwoMinYes}
                >
                  <Text style={styles.buttonPrimaryText}>✅ {t('inbox.doneIt')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: tc.border }]}
                  onPress={handleTwoMinNo}
                >
                  <Text style={[styles.buttonText, { color: tc.text }]}>{t('inbox.takesLonger')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {processingStep === 'decide' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepQuestion, { color: tc.text }]}>
                {t('inbox.whatNext')}
              </Text>
              <Text style={[styles.stepHint, { color: tc.secondaryText }]}>
                {t('inbox.actionableHint')}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => handleDecision('defer')}
                >
                  <Text style={styles.buttonPrimaryText}>📋 {t('inbox.illDoIt')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#F59E0B' }]}
                  onPress={() => handleDecision('delegate')}
                >
                  <Text style={styles.buttonPrimaryText}>👤 {t('inbox.delegate')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {processingStep === 'context' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepQuestion, { color: tc.text }]}>
                {t('inbox.whereDoIt')}
              </Text>
              <Text style={[styles.stepHint, { color: tc.secondaryText }]}>
                {t('inbox.addContext')}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contextScroll}>
                <TouchableOpacity
                  style={[styles.contextChip, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleSetContext(null)}
                >
                  <Text style={styles.contextChipText}>{t('inbox.skip')}</Text>
                </TouchableOpacity>
                {PRESET_CONTEXTS.map(ctx => (
                  <TouchableOpacity
                    key={ctx}
                    style={[styles.contextChip, { backgroundColor: tc.border }]}
                    onPress={() => handleSetContext(ctx)}
                  >
                    <Text style={[styles.contextChipText, { color: tc.text }]}>{ctx}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.customContextContainer}>
                <TextInput
                  style={[styles.contextInput, {
                    backgroundColor: tc.bg,
                    borderColor: tc.border,
                    color: tc.text
                  }]}
                  placeholder={t('inbox.addContext')}
                  placeholderTextColor={tc.secondaryText}
                  value={newContext}
                  onChangeText={setNewContext}
                />
                <TouchableOpacity
                  style={[styles.addContextButton, !newContext.trim() && { backgroundColor: tc.border }]}
                  disabled={!newContext.trim()}
                  onPress={() => {
                    if (newContext.trim()) {
                      const ctx = newContext.trim().startsWith('@')
                        ? newContext.trim()
                        : `@${newContext.trim()}`;
                      handleSetContext(ctx);
                      setNewContext('');
                    }
                  }}
                >
                  <Text style={styles.addContextButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setProcessingTask(null)}
          >
            <Text style={[styles.cancelButtonText, { color: tc.secondaryText }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {inboxTasks.length > 0 && (
        <View style={[styles.processBar, { backgroundColor: tc.cardBg, borderBottomColor: tc.border }]}>
          <TouchableOpacity
            style={styles.processButton}
            onPress={() => inboxTasks.length > 0 && startProcessing(inboxTasks[0])}
          >
            <Text style={styles.processButtonText}>
              ▶️ {t('inbox.processButton')} ({inboxTasks.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TaskList statusFilter="inbox" title={t('inbox.title')} />
      {renderProcessingModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  processBar: {
    padding: 12,
    borderBottomWidth: 1,
  },
  processButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  processButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  taskPreview: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  taskPreviewText: {
    fontSize: 16,
    fontWeight: '500',
  },
  stepContent: {
    gap: 16,
  },
  stepQuestion: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
  },
  buttonSuccess: {
    backgroundColor: '#10B981',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  contextScroll: {
    marginTop: 8,
  },
  contextChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 10,
  },
  contextChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  customContextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  contextInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addContextButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  addContextButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 20,
  },
});
