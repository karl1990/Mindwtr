import SwiftUI
import WidgetKit

private let mindwtrWidgetKind = "MindwtrTasksWidget"
private let mindwtrWidgetAppGroup = "group.tech.dongdongbh.mindwtr"
private let mindwtrWidgetPayloadKey = "mindwtr-ios-widget-payload"

private struct MindwtrWidgetTaskItem: Decodable {
    let id: String
    let title: String
    let statusLabel: String?
}

private struct MindwtrWidgetPalette: Decodable {
    let background: String
    let card: String
    let border: String
    let text: String
    let mutedText: String
    let accent: String
    let onAccent: String
}

private struct MindwtrTasksWidgetPayload: Decodable {
    let headerTitle: String
    let subtitle: String
    let items: [MindwtrWidgetTaskItem]
    let emptyMessage: String
    let captureLabel: String
    let focusUri: String
    let quickCaptureUri: String
    let palette: MindwtrWidgetPalette

    static var fallback: MindwtrTasksWidgetPayload {
        MindwtrTasksWidgetPayload(
            headerTitle: "Today",
            subtitle: "Inbox: 0",
            items: [],
            emptyMessage: "No tasks",
            captureLabel: "Quick capture",
            focusUri: "mindwtr:///focus",
            quickCaptureUri: "mindwtr:///capture-quick?mode=text",
            palette: MindwtrWidgetPalette(
                background: "#F8FAFC",
                card: "#FFFFFF",
                border: "#CBD5E1",
                text: "#0F172A",
                mutedText: "#475569",
                accent: "#2563EB",
                onAccent: "#FFFFFF"
            )
        )
    }
}

private struct MindwtrTasksWidgetEntry: TimelineEntry {
    let date: Date
    let payload: MindwtrTasksWidgetPayload
}

private struct MindwtrTasksWidgetProvider: TimelineProvider {
    func placeholder(in _: Context) -> MindwtrTasksWidgetEntry {
        MindwtrTasksWidgetEntry(date: Date(), payload: .fallback)
    }

    func getSnapshot(in _: Context, completion: @escaping (MindwtrTasksWidgetEntry) -> Void) {
        completion(MindwtrTasksWidgetEntry(date: Date(), payload: loadPayload()))
    }

    func getTimeline(in _: Context, completion: @escaping (Timeline<MindwtrTasksWidgetEntry>) -> Void) {
        let now = Date()
        let entry = MindwtrTasksWidgetEntry(date: now, payload: loadPayload())
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }

    private func loadPayload() -> MindwtrTasksWidgetPayload {
        guard
            let defaults = UserDefaults(suiteName: mindwtrWidgetAppGroup),
            let jsonString = defaults.string(forKey: mindwtrWidgetPayloadKey),
            let data = jsonString.data(using: .utf8)
        else {
            return .fallback
        }

        do {
            return try JSONDecoder().decode(MindwtrTasksWidgetPayload.self, from: data)
        } catch {
            return .fallback
        }
    }
}

private struct MindwtrTasksWidgetView: View {
    let entry: MindwtrTasksWidgetEntry

    var body: some View {
        let payload = entry.payload
        VStack(alignment: .leading, spacing: 8) {
            Link(destination: URL(string: payload.focusUri) ?? URL(fileURLWithPath: "/")) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(payload.headerTitle)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(hexColor(payload.palette.text))
                        .lineLimit(1)
                    Text(payload.subtitle)
                        .font(.system(size: 11))
                        .foregroundColor(hexColor(payload.palette.mutedText))
                        .lineLimit(1)
                }
            }

            if payload.items.isEmpty {
                TaskLineView(
                    title: payload.emptyMessage,
                    textColor: payload.palette.mutedText,
                    cardColor: payload.palette.card,
                    borderColor: payload.palette.border,
                    focusUri: payload.focusUri
                )
            } else {
                ForEach(payload.items.prefix(3), id: \.id) { item in
                    TaskLineView(
                        title: "• \(item.title)",
                        textColor: payload.palette.text,
                        cardColor: payload.palette.card,
                        borderColor: payload.palette.border,
                        focusUri: payload.focusUri
                    )
                }
            }

            Spacer(minLength: 0)

            Link(destination: URL(string: payload.quickCaptureUri) ?? URL(fileURLWithPath: "/")) {
                Text(payload.captureLabel)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(hexColor(payload.palette.onAccent))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(hexColor(payload.palette.accent))
                    .clipShape(Capsule())
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(hexColor(payload.palette.background))
    }
}

private struct TaskLineView: View {
    let title: String
    let textColor: String
    let cardColor: String
    let borderColor: String
    let focusUri: String

    var body: some View {
        Link(destination: URL(string: focusUri) ?? URL(fileURLWithPath: "/")) {
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(hexColor(textColor))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 6)
                .padding(.horizontal, 8)
                .background(hexColor(cardColor))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(hexColor(borderColor), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

private func hexColor(_ hex: String) -> Color {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&int)

    let r: UInt64
    let g: UInt64
    let b: UInt64
    let a: UInt64

    switch cleaned.count {
    case 3:
        (r, g, b, a) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17, 255)
    case 4:
        (r, g, b, a) = ((int >> 12) * 17, (int >> 8 & 0xF) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6:
        (r, g, b, a) = (int >> 16, int >> 8 & 0xFF, int & 0xFF, 255)
    case 8:
        // Supports CSS-style #RRGGBBAA payload values.
        (r, g, b, a) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
        (r, g, b, a) = (15, 23, 42, 255)
    }

    return Color(
        .sRGB,
        red: Double(r) / 255,
        green: Double(g) / 255,
        blue: Double(b) / 255,
        opacity: Double(a) / 255
    )
}

struct MindwtrTasksWidget: Widget {
    let kind: String = mindwtrWidgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MindwtrTasksWidgetProvider()) { entry in
            MindwtrTasksWidgetView(entry: entry)
        }
        .configurationDisplayName("Mindwtr")
        .description("Inbox, focus, and quick capture")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
