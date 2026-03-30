import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
  FlatList as FlatListType,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MessageBubble from '../components/MessageBubble';
import {messages as initialMessages} from '../data/dummyData';
import {COLORS, baseStyles} from '../styles/globalStyles';
import {RootStackParamList, Message} from '../types';
import {useTheme} from '../context/ThemeContext';
import {hapticLight, hapticSuccess} from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC<Props> = ({route}) => {
  const {skill} = route.params ?? {};
  const [messages, setMessages]   = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState<string>('');
  const flatListRef = useRef<FlatListType<Message>>(null);

  const {theme} = useTheme();
  const themeColors = COLORS[theme];

  const sendMessage = (): void => {
    const text = inputText.trim();
    if (!text) {return;}

    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

    const newMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'me',
      time,
    };

    hapticSuccess();
    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  };

  const renderItem = ({item}: ListRenderItemInfo<Message>) => (
    <MessageBubble message={item} />
  );

  return (
    <KeyboardAvoidingView
      style={[baseStyles.container, {backgroundColor: themeColors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Chat Header - wrapped in SafeAreaView to fix status bar collision */}
      <SafeAreaView edges={['top']} style={{backgroundColor: COLORS.primary}}>
        <View style={styles.chatHeader}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{skill?.avatar ?? '??'}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{skill?.name ?? 'Unknown User'}</Text>
            <Text style={styles.headerStatus}>🟢 Online</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Messages List */}
      <FlatList<Message>
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: false})}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, {backgroundColor: themeColors.card, borderTopColor: themeColors.border}]}>
        <TextInput
          style={[styles.textInput, {backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border}]}
          placeholder="Type a message..."
          placeholderTextColor={themeColors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && {backgroundColor: themeColors.border}]}
          onPress={() => { hapticLight(); sendMessage(); }}
          disabled={!inputText.trim()}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerAvatarText: {fontSize: 14, fontWeight: '800', color: COLORS.white},
  headerInfo: {flex: 1},
  headerName: {fontSize: 16, fontWeight: '700', color: COLORS.white},
  headerStatus: {fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1},
  messagesList: {paddingTop: 12, paddingBottom: 10},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1.5,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {color: COLORS.white, fontSize: 16, fontWeight: '700'},
});

export default ChatScreen;
