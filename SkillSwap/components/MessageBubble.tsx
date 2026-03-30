import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Message} from '../types';
import {COLORS} from '../styles/globalStyles';
import {useTheme} from '../context/ThemeContext';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({message}) => {
  const isMe = message.sender === 'me';
  const {theme} = useTheme();
  const themeColors = COLORS[theme];

  return (
    <View style={[styles.wrapper, isMe ? styles.wrapperMe : styles.wrapperOther]}>
      <View style={[
          styles.bubble, 
          isMe ? styles.bubbleMe : [styles.bubbleOther, {backgroundColor: themeColors.card, borderColor: themeColors.border}]
      ]}>
        <Text style={[styles.text, isMe ? styles.textMe : [styles.textOther, {color: themeColors.text}]]}>
          {message.text}
        </Text>
      </View>
      <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther, {color: themeColors.textLight}]}>
        {message.time}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 4,
    maxWidth: '78%',
  },
  wrapperMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  wrapperOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textMe: {
    color: COLORS.white,
  },
  textOther: {
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  timeMe: {
    textAlign: 'right',
  },
  timeOther: {
    textAlign: 'left',
  },
});

export default MessageBubble;
