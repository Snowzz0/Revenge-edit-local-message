// @ts-nocheck
import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = (findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow);
const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");
const Messages = findByProps("sendMessage", "startEditMessage", "editMessage");

const edits = new Map();
let isEditing = false;
const patches = [];
const React = window.React || require("react");

export default {
    onLoad() {
        console.log("[EditLocally] ✅ Plugin carregado");
        patches.push(before("openLazy", LazyActionSheet, ([component, key, msg]) => {
            const message = msg?.message;
            if (key !== "MessageLongPressActionSheet" || !message) return;
            component.then(instance => {
                const Component = instance.default || instance;
                const unpatch = after("default", Component, (_, res) => {
                    setTimeout(unpatch, 0);
                    const buttons = findInReactTree(res, x => x?.[0]?.type?.name === "ActionSheetRow");
                    if (!buttons) return;
                    const currentUser = UserStore.getCurrentUser();
                    const currentMessage = MessageStore.getMessage(message.channel_id, message.id) ?? message;
                    if (currentMessage.author.id === currentUser.id) return;
                    if (buttons.some(b => b?.props?.label === "Edit Locally")) return;
                    const position = Math.max(buttons.findIndex(x => x?.props?.message === "MARK_UNREAD"), 0);
                    const editIcon = getAssetIDByName("ic_edit_24px") ?? undefined;
                    const handleEdit = () => {
                        isEditing = true;
                        if (!edits.has(currentMessage.id)) {
                            edits.set(currentMessage.id, JSON.parse(JSON.stringify(currentMessage)));
                        }
                        LazyActionSheet.hideActionSheet();
                        Messages.startEditMessage(currentMessage.channel_id, currentMessage.id, currentMessage.content);
                    };
                    buttons.splice(position, 0, React.createElement(ActionSheetRow, {
                        label: "✎ Edit Locally",
                        icon: editIcon,
                        onPress: handleEdit,
                        key: "edit-locally-btn"
                    }));
                });
            });
        }));
        patches.push(before("editMessage", Messages, (args) => {
            const [channelId, messageId, content] = args;
            if (!isEditing) return;
            const baseMessage = edits.get(messageId);
            if (!baseMessage) return;
            FluxDispatcher.dispatch({
                type: "MESSAGE_UPDATE",
                message: { ...baseMessage, content, edited_timestamp: new Date().toISOString() },
            });
            isEditing = false;
            edits.delete(messageId);
            return false;
        }));
        patches.push(after("endEditMessage", Messages, () => { isEditing = false; }));
    },
    onUnload() {
        console.log("[EditLocally] ❌ Plugin descarregado");
        patches.forEach(p => p());
        patches.length = 0;
        edits.clear();
    }
};
