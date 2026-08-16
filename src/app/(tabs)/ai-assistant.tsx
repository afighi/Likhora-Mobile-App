import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sparkles, Send, Bell, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { useNotification } from '@/context/NotificationContext';
import { askKhoraAI, generateBusinessNameSuggestions } from '@/services/claude';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  isError?: boolean;
}

export default function AIAssistantTab() {
  const router = useRouter();
  const { unreadCount } = useNotification();
  const params = useLocalSearchParams<{ prompt?: string; taskTitle?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Mabuhay! I am Khora AI, your 24/7 business & legal compliance assistant. How can I help launch or grow your Philippine business today?',
      time: getCurrentTime(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [processedPrompt, setProcessedPrompt] = useState<string | null>(null);

  // Handle incoming redirect prompt parameters from Roadmap
  useEffect(() => {
    if (params.prompt && params.prompt !== processedPrompt) {
      setProcessedPrompt(params.prompt);

      const userQuery = params.prompt;
      const displayMsg = params.taskTitle 
        ? `I need legal & operational guidance for: "${params.taskTitle}"` 
        : userQuery;

      const userMsgObj: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: displayMsg,
        time: getCurrentTime(),
      };

      setMessages((prev) => [...prev, userMsgObj]);

      const fetchLegalGuidance = async () => {
        setLoading(true);
        const aiResponse = await askKhoraAI(userQuery);
        setLoading(false);

        const aiMsgObj: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiResponse.content,
          time: getCurrentTime(),
          isError: !aiResponse.success,
        };

        setMessages((prev) => [...prev, aiMsgObj]);
        
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 150);
      };

      fetchLegalGuidance();
    }
  }, [params.prompt, params.taskTitle, processedPrompt]);

  // Send User Message with Validations
  const handleSend = async (customPrompt?: string) => {
    const targetText = (customPrompt || prompt).trim();
    
    // Validation 1: Empty or whitespace guard
    if (!targetText) return;

    // Validation 2: Character limit check
    if (targetText.length > 500) {
      Alert.alert('Message Too Long', 'Please limit your inquiry to 500 characters or less.');
      return;
    }

    // Validation 3: Rate limiting / Loading guard
    if (loading) return;

    if (!customPrompt) setPrompt('');

    const userMsgObj: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: targetText,
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsgObj]);

    setLoading(true);
    const aiResponse = await askKhoraAI(targetText);
    setLoading(false);

    const aiMsgObj: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: aiResponse.content || 'Unable to connect right now. Please try again.',
      time: getCurrentTime(),
      isError: !aiResponse.success,
    };

    setMessages((prev) => [...prev, aiMsgObj]);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Quick Suggestion Chip Handlers
  const handleQuickPrompt = (quickText: string) => {
    if (loading) return;
    handleSend(quickText);
  };

  const handleNameHelper = async () => {
    if (loading) return;
    setLoading(true);

    const userMsgObj: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Suggest business names for my Filipino food stall venture!',
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsgObj]);

    const nameRes = await generateBusinessNameSuggestions('Carinderia / Food Stall', 'Warm & Catchy');
    setLoading(false);

    const aiMsgObj: ChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: nameRes.content,
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, aiMsgObj]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Reset / Clear Chat History
  const handleClearChat = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to reset your chat history with Khora AI?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: 'init-1',
                sender: 'ai',
                text: 'Chat history cleared. Mabuhay! How can Khora AI help your business today?',
                time: getCurrentTime(),
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.container}>
          
          {/* Top Header Section */}
          <View style={styles.topHeaderSection}>
            {/* Top Action Bar (Reset & Notification Bell anchored at top right) */}
            <View style={styles.topNotifBar}>
              <TouchableOpacity 
                style={styles.headerIconBtn} 
                onPress={handleClearChat}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <RotateCcw size={18} color={LikhoraColors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.notifIconCircle} 
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Bell size={19} color={LikhoraColors.textPrimary} />
                {unreadCount > 0 && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            </View>

            {/* Title Row directly below */}
            <View style={styles.headerTitleRow}>
              <Text style={styles.title}>Khora AI Assistant</Text>
              <Text style={styles.subtitle}>24/7 Filipino Small Business Advisor</Text>
            </View>
          </View>

          {/* 2. MESSAGES CONVERSATION SCROLLVIEW */}
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContent} 
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m, idx) => (
              <View
                key={m.id ? `${m.id}-${idx}` : `msg-${idx}`}
                style={[
                  styles.bubbleContainer,
                  m.sender === 'user' ? styles.userBubbleContainer : styles.aiBubbleContainer,
                ]}
              >
                {m.sender === 'ai' && (
                  <View style={styles.aiAvatar}>
                    <Sparkles size={14} color="#FFFFFF" />
                  </View>
                )}

                <View style={{ maxWidth: '82%' }}>
                  <View
                    style={[
                      styles.bubble,
                      m.sender === 'user' ? styles.userBubble : styles.aiBubble,
                      m.isError && styles.errorBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        m.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText,
                      ]}
                    >
                      {m.text}
                    </Text>
                  </View>

                  {/* Message Time & Retry Option */}
                  <View style={[styles.timeRow, m.sender === 'user' ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                    <Text style={styles.timeText}>{m.time}</Text>
                    {m.isError && (
                      <TouchableOpacity onPress={() => handleSend(m.text)} style={styles.retryBtn}>
                        <RotateCcw size={10} color={LikhoraColors.errorRed} style={{ marginRight: 2 }} />
                        <Text style={styles.retryText}>Retry</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <View style={[styles.bubbleContainer, styles.aiBubbleContainer]}>
                <View style={styles.aiAvatar}>
                  <Sparkles size={14} color="#FFFFFF" />
                </View>
                <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.aiBubbleText, { fontSize: 13 }]}>
                    Khora AI is typing guidance...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* 3. QUICK ACTION SUGGESTION CHIPS */}
          <View style={styles.helperRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.four }}>
              <TouchableOpacity 
                style={styles.helperChip} 
                onPress={() => handleQuickPrompt("How do I register for Barangay Clearance and DTI permit?")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <ShieldCheck size={14} color={LikhoraColors.aiBlue} style={{ marginRight: 6 }} />
                <Text style={styles.helperChipText}>Barangay & DTI Permits</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.helperChip} 
                onPress={() => handleQuickPrompt("How do I compute product costing with 35% margin?")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={LikhoraColors.highlightYellow} style={{ marginRight: 6 }} />
                <Text style={styles.helperChipText}>Costing & Margins</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.helperChip} 
                onPress={handleNameHelper}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={LikhoraColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.helperChipText}>Name Generator</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 4. INPUT CONTAINER WITH FIXED LAYOUT & VALIDATIONS */}
          <View style={styles.inputOuterContainer}>
            {/* Character Limit Counter Warning */}
            {prompt.length > 400 && (
              <View style={styles.charCountRow}>
                <Text style={[styles.charCountText, prompt.length >= 500 && { color: LikhoraColors.errorRed }]}>
                  {prompt.length}/500 characters
                </Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={prompt}
                  onChangeText={(text) => {
                    if (text.length <= 500) setPrompt(text);
                  }}
                  placeholder="Ask Khora AI business guidance..."
                  maxLength={500}
                  style={{ marginBottom: 0 }}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (loading || !prompt.trim()) && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={loading || !prompt.trim()}
                activeOpacity={0.8}
              >
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  container: {
    flex: 1,
    backgroundColor: LikhoraColors.backgroundScreen,
  },
  topHeaderSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: LikhoraColors.border,
  },
  topNotifBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  headerTitleRow: {
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  subtitle: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
    fontFamily: LikhoraFont.fontFamily,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LikhoraColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: LikhoraColors.border,
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: LikhoraColors.errorRed,
  },
  messagesContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: 12,
  },
  bubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  aiBubbleContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LikhoraColors.aiBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 16,
  },
  bubble: {
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  userBubble: {
    backgroundColor: LikhoraColors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: LikhoraColors.aiBlueSoft,
    borderWidth: 1,
    borderColor: '#C3E8F8',
    borderBottomLeftRadius: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBubble: {
    backgroundColor: LikhoraColors.errorRedSoft,
    borderWidth: 1,
    borderColor: LikhoraColors.errorRed,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: LikhoraFont.fontFamily,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  aiBubbleText: {
    color: LikhoraColors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 4,
    gap: 8,
  },
  timeText: {
    fontSize: 10,
    color: LikhoraColors.textPlaceholder,
    fontFamily: LikhoraFont.fontFamily,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryText: {
    fontSize: 10,
    fontWeight: '700',
    color: LikhoraColors.errorRed,
    fontFamily: LikhoraFont.fontFamily,
  },
  helperRow: {
    paddingVertical: 6,
  },
  helperChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.aiBlueSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#C3E8F8',
  },
  helperChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  inputOuterContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 110, // Sits comfortably above floating glass tab bar
    paddingTop: 4,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  charCountText: {
    fontSize: 11,
    color: LikhoraColors.textSecondary,
    fontWeight: '600',
    fontFamily: LikhoraFont.fontFamily,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LikhoraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: LikhoraColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
});
