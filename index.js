(function(exports,metro,common,patcher,assets,components,utils){'use strict';const LazyActionSheet = metro.findByProps("openLazy", "hideActionSheet");
const ActionSheetRow = metro.findByProps("ActionSheetRow")?.ActionSheetRow ?? components.Forms.FormRow;
const MessageStore = metro.findByStoreName("MessageStore");
const UserStore = metro.findByStoreName("UserStore");
const Messages = metro.findByProps("sendMessage", "startEditMessage", "editMessage");
const edits = /* @__PURE__ */ new Map();
let isEditing = false;
const patches = [];
const React = window.React || require("react");
var index = {
  onLoad() {
    console.log("[EditLocally] \u2705 Plugin carregado com sucesso!");
    patches.push(patcher.before("openLazy", LazyActionSheet, ([component, key, msg]) => {
      const message = msg?.message;
      if (key !== "MessageLongPressActionSheet" || !message) return;
      component.then((instance) => {
        const Component = instance.default || instance;
        const unpatch = patcher.after("default", Component, (_, res) => {
          setTimeout(unpatch, 0);
          const buttons = utils.findInReactTree(res, (x) => x?.[0]?.type?.name === "ActionSheetRow");
          if (!buttons) return;
          const currentUser = UserStore.getCurrentUser();
          const currentMessage = MessageStore.getMessage(message.channel_id, message.id) ?? message;
          if (currentMessage.author.id === currentUser.id) return;
          if (buttons.some((b) => b?.props?.label === "Edit Locally")) return;
          const position = Math.max(
            buttons.findIndex((x) => x?.props?.message === "MARK_UNREAD"),
            0
          );
          const editIcon = assets.getAssetIDByName("ic_edit_24px") ?? void 0;
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
          const buttonElement = React.createElement(
            ActionSheetRow,
            {
              label: "\u270E Edit Locally",
              icon: editIcon,
              onPress: handleEdit,
              key: "edit-locally-btn"
            }
          );
          buttons.splice(position, 0, buttonElement);
        });
      });
    }));
    patches.push(patcher.before("editMessage", Messages, (args) => {
      const [channelId, messageId, content] = args;
      if (!isEditing) return;
      const baseMessage = edits.get(messageId);
      if (!baseMessage) return;
      common.FluxDispatcher.dispatch({
        type: "MESSAGE_UPDATE",
        message: {
          ...baseMessage,
          content,
          edited_timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      isEditing = false;
      edits.delete(messageId);
      return false;
    }));
    patches.push(patcher.after("endEditMessage", Messages, () => {
      if (isEditing) {
        isEditing = false;
        console.warn("[EditLocally] \u26A0\uFE0F Edi\xE7\xE3o finalizada for\xE7adamente");
      }
    }));
  },
  onUnload() {
    console.log("[EditLocally] \u274C Plugin descarregado");
    patches.forEach((p) => p());
    patches.length = 0;
    edits.clear();
  }
};exports.default=index;Object.defineProperty(exports,'__esModule',{value:true});return exports;})({},vendetta.metro,vendetta.metro.common,vendetta.patcher,vendetta.ui.assets,vendetta.ui.components,vendetta.utils);