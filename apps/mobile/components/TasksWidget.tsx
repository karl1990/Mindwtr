import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { TasksWidgetPayload } from '../lib/widget-data';

export function buildTasksWidgetTree(payload: TasksWidgetPayload) {
    const { headerTitle, subtitle, items, emptyMessage, captureLabel, palette } = payload;
    const children: React.ReactElement[] = [
        React.createElement(TextWidget, {
            key: 'header',
            text: headerTitle,
            style: { color: palette.text, fontSize: 14, fontWeight: '600' },
        }),
        React.createElement(TextWidget, {
            key: 'subtitle',
            text: subtitle,
            style: { color: palette.mutedText, fontSize: 11, marginTop: 4 },
        }),
    ];

    if (items.length > 0) {
        items.forEach((item, index) => {
            children.push(
                React.createElement(TextWidget, {
                    key: `item-${item.id}`,
                    text: `• ${item.title}`,
                    style: {
                        color: palette.text,
                        fontSize: 12,
                        marginTop: index === 0 ? 10 : 6,
                        backgroundColor: palette.card,
                        borderRadius: 6,
                        borderColor: palette.border,
                        borderWidth: 1,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                    },
                    maxLines: 1,
                    truncate: 'END',
                })
            );
        });
    } else {
        children.push(
            React.createElement(TextWidget, {
                key: 'empty',
                text: emptyMessage,
                style: {
                    color: palette.mutedText,
                    fontSize: 12,
                    marginTop: 10,
                    backgroundColor: palette.card,
                    borderRadius: 6,
                    borderColor: palette.border,
                    borderWidth: 1,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                },
            })
        );
    }

    children.push(
        React.createElement(TextWidget, {
            key: 'capture',
            text: captureLabel,
            style: {
                color: palette.onAccent,
                fontSize: 12,
                fontWeight: '600',
                backgroundColor: palette.accent,
                paddingVertical: 6,
                paddingHorizontal: 10,
                marginTop: 12,
                borderRadius: 999,
            },
            clickAction: 'OPEN_URI',
            clickActionData: { uri: 'mindwtr:///capture-quick?mode=text' },
        })
    );

    return React.createElement(
        FlexWidget,
        {
            style: {
                width: 'match_parent',
                height: 'match_parent',
                padding: 12,
                backgroundColor: palette.background,
            },
            clickAction: 'OPEN_URI',
            clickActionData: { uri: 'mindwtr:///focus' },
        },
        ...children
    );
}
