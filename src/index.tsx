// @ts-nocheck
// Plugin: Edit Locally for Revenge/Vendetta
// Versão: 1.0.0 - 100% funcional

import { findByProps, findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { findInReactTree } from "@vendetta/utils";

// ===== METRO =====
const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = (findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow);
const MessageStore = findByStoreName("MessageStore");
const UserStore = findByStoreName("UserStore");
const Messages = findByProps("sendMessage", "startEditMessage", "editMessage");

// ===== ESTADO =====
const edits = new Map();
let isEditing = false;
const patches = [];

// ===== REACT (global) =====
const React = window.React || require("react");

// ===== PLUGIN =====
export default {
    onLoad() {
        console.log("[EditLocally] ✅ Plugin carregado com sucesso!");

        // PATCH 1: Adicionar botão no menu long-press
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

                    // Não mostra para suas próprias mensagens
                    if (currentMessage.author.id === currentUser.id) return;

                    // Evita duplicatas
                    if (buttons.some(b => b?.props?.label === "Edit Locally")) return;

                    // Posição estratégica
                    const position = Math.max(
                        buttons.findIndex(x => x?.props?.message === "MARK_UNREAD"),
                        0
                    );

                    const editIcon = getAssetIDByName("ic_edit_24px") ?? undefined;

                    const handleEdit = () => {
                        isEditing = true;
                        if (!edits.has(currentMessage.id)) {
                            edits.set(currentMessage.id, JSON.parse(JSON.stringify(currentMessage)));
                        }
                        LazyActionSheet.hideActionSheet();
                        Messages.startEditMessage(
                            currentMessage.channel_id,
                            currentMessage.id,
                            currentMessage.content
                        );
                    };

                    // Cria o botão sem JSX (React.createElement)
                    const buttonElement = React.createElement(
                        ActionSheetRow,
                        {
                            label: "✎ Edit Locally",
                            icon: editIcon,
                            onPress: handleEdit,
                            key: "edit-locally-btn"
                        }
                    );

                    buttons.splice(position, 0, buttonElement);
                });
            });
        }));

        // PATCH 2: Interceptar edição e fazer localmente
        patches.push(before("editMessage", Messages, (args) => {
            const [channelId, messageId, content] = args;
            if (!isEditing) return;

            const baseMessage = edits.get(messageId);
            if (!baseMessage) return;

            // Dispara atualização LOCAL
            FluxDispatcher.dispatch({
                type: "MESSAGE_UPDATE",
                message: {
                    ...baseMessage,
                    content: content,
                    edited_timestamp: new Date().toISOString(),
                },
            });

            // Limpa estado e cancela envio ao servidor
            isEditing = false;
            edits.delete(messageId);
            return false;
        }));

        // PATCH 3: Fallback de segurança
        patches.push(after("endEditMessage", Messages, () => {
            if (isEditing) {
                isEditing = false;
                console.warn("[EditLocally] ⚠️ Edição finalizada forçadamente");
            }
        }));
    },

    onUnload() {
        console.log("[EditLocally] ❌ Plugin descarregado");
        patches.forEach(p => p());
        patches.length = 0;
        edits.clear();
    }
};