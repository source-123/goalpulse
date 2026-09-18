import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserKey } from './userService';
import {
  sendChatMessage, subscribeChatMessages,
  ChatMessage, formatMessageTime, deleteChatMessage,
} from './chatService';

interface Props {
  code: string;
  userEmail: string;
  userName: string;
}

export default function RoomChat({ code, userEmail, userName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const myKey = getUserKey(userEmail);

  useEffect(() => {
    const unsub = subscribeChatMessages(code, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Auto-scroll en bas
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [code]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;

    setSending(true);
    await sendChatMessage(code, userEmail, userName, t);
    setText('');
    setSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const handleLongPress = (msg: ChatMessage) => {
    // Seulement l'auteur peut supprimer
    if (msg.userId !== myKey) return;

    Alert.alert('Message', 'Que veux-tu faire ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteChatMessage(code, msg.id),
      },
    ]);
  };

  const renderMessage = (msg: ChatMessage) => {
    const isMe = msg.userId === myKey;
    const isSystem = msg.type === 'system';

    if (isSystem) {
      return (
        <View key={msg.id} style={styles.systemRow}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{msg.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={msg.id}
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(msg)}
        style={[
          styles.messageRow,
          isMe && styles.messageRowMe,
        ]}
      >
        {!isMe && (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {msg.userName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={[styles.messageBox, isMe && styles.messageBoxMe]}>
          {!isMe && (
            <Text style={styles.messageName} numberOfLines={1}>
              {msg.userName}
            </Text>
          )}
          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
            {msg.text}
          </Text>
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {formatMessageTime(msg.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      {/* LISTE DES MESSAGES */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={50} color="#333" />
            <Text style={styles.emptyText}>Aucun message</Text>
            <Text style={styles.emptySubtext}>
              Sois le premier à dire bonjour 👋
            </Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {/* INPUT */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Écris un message..."
          placeholderTextColor="#666"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Ionicons name="send" size={18} color="#000" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: { color: '#39FF14', marginTop: 10 },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 12, marginTop: 4 },

  messagesList: { flex: 1 },

  // MESSAGE NORMAUX
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#39FF1440',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarSmallText: {
    color: '#39FF14',
    fontSize: 10,
    fontWeight: 'bold',
  },
  messageBox: {
    maxWidth: '75%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  messageBoxMe: {
    backgroundColor: '#39FF14',
    borderColor: '#2BC40F',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  messageName: {
    color: '#39FF14',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 19,
  },
  messageTextMe: {
    color: '#000',
    fontWeight: '500',
  },
  messageTime: {
    color: '#666',
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: '#00000080',
  },

  // MESSAGE SYSTÈME
  systemRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemBubble: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  systemText: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // INPUT BAR
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0f0f0f',
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#262626',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#39FF14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1f1f1f',
    opacity: 0.5,
  },
});
