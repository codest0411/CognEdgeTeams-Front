import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { createChatSocket } from '../lib/socket'

export default function Chat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchError, setSearchError] = useState('')
  const [searchSuccess, setSearchSuccess] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [userCache, setUserCache] = useState(new Map())
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  // Force current user to be online (fallback) and periodic refresh
  useEffect(() => {
    if (user?.email && socketConnected) {
      // Initial fallback after 2 seconds
      const initialTimer = setTimeout(() => {
        setOnlineUsers(prev => {
          const newSet = new Set([...prev, user.email])
          
          // Also mark conversation partner as online if we have an active conversation
          if (selectedConversation?.otherUser?.email) {
            newSet.add(selectedConversation.otherUser.email)
            console.log('Marked conversation partner as online:', selectedConversation.otherUser.email)
          }
          
          console.log('Force adding users to online status:', Array.from(newSet))
          return newSet
        })
      }, 2000)

      // Periodic refresh every 10 seconds to ensure online status
      const refreshTimer = setInterval(() => {
        setOnlineUsers(prev => {
          const newSet = new Set([...prev, user.email])
          
          // Keep conversation partner online if actively chatting
          if (selectedConversation?.otherUser?.email) {
            newSet.add(selectedConversation.otherUser.email)
          }
          
          return newSet
        })
        console.log('Refreshed online status for active users')
      }, 10000)

      return () => {
        clearTimeout(initialTimer)
        clearInterval(refreshTimer)
      }
    }
  }, [user?.email, socketConnected, selectedConversation?.otherUser?.email])

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await createChatSocket()
        socketRef.current = socket
        socket.connect()

        socket.on('connect', () => {
          console.log('Connected to chat server')
          setSocketConnected(true)
          
          // Immediately mark current user as online
          setOnlineUsers(prev => {
            const newSet = new Set([...prev, user.email])
            console.log('Added self to online users on connect:', Array.from(newSet))
            return newSet
          })
        })

        socket.on('disconnect', () => {
          console.log('Disconnected from chat server')
          setSocketConnected(false)
        })

        socket.on('new-message', (messageData) => {
          console.log('Received new message via socket:', messageData)
          
          // Handle both direct message data and wrapped message data
          const message = messageData.message || messageData
          
          // Mark the sender as online when they send a message
          if (message.sender && message.sender.email) {
            setOnlineUsers(prev => new Set([...prev, message.sender.email]))
            console.log('Marked message sender as online:', message.sender.email)
          }
          
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const messageExists = prev.some(msg => msg.id === message.id)
            if (!messageExists) {
              console.log('Adding new message to chat:', message)
              
              // If this is a new message from someone else, mark it as read after a short delay
              if (message.sender_id !== user.id && selectedConversation) {
                setTimeout(() => {
                  markMessagesAsRead(selectedConversation.id)
                }, 1000)
              }
              
              return [...prev, message]
            }
            console.log('Message already exists, skipping duplicate')
            return prev
          })
          
          // Update conversations list to show latest message
          setConversations(prev => prev.map(conv => 
            conv.id === (message.conversation_id || messageData.conversationId)
              ? { ...conv, updated_at: message.created_at || new Date().toISOString() }
              : conv
          ))
        })

        socket.on('user-typing', (data) => {
          console.log('User started typing:', data.userEmail)
          setTypingUsers(prev => new Set([...prev, data.userEmail]))
          
          // Auto-clear typing indicator after 3 seconds if no stop-typing event
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev)
              newSet.delete(data.userEmail)
              return newSet
            })
          }, 3000)
        })

        socket.on('user-stop-typing', (data) => {
          console.log('User stopped typing:', data.userEmail)
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(data.userEmail)
            return newSet
          })
        })

        socket.on('messages-read', (data) => {
          console.log('Messages marked as read:', data)
          // Update local state to show messages as read
          setMessages(prev => prev.map(msg => 
            data.messageIds.includes(msg.id) 
              ? { ...msg, read_at: data.readAt }
              : msg
          ))
        })

        socket.on('user-online', (data) => {
          console.log('User came online:', data.userEmail)
          setOnlineUsers(prev => {
            const newSet = new Set([...prev, data.userEmail])
            console.log('Online users after adding:', Array.from(newSet))
            // Force conversations to re-render by updating their timestamp
            setConversations(convs => [...convs])
            return newSet
          })
        })

        socket.on('user-offline', (data) => {
          console.log('User went offline:', data.userEmail)
          setOnlineUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(data.userEmail)
            console.log('Online users after removing:', Array.from(newSet))
            // Force conversations to re-render by updating their timestamp
            setConversations(convs => [...convs])
            return newSet
          })
        })

        socket.on('online-users-list', (data) => {
          console.log('Received online users list:', data.users)
          const userEmails = data.users.map(u => u.email)
          
          // Always include the current user as online since they're connected
          if (user?.email && !userEmails.includes(user.email)) {
            userEmails.push(user.email)
          }
          
          const uniqueEmails = [...new Set(userEmails)] // Remove duplicates
          setOnlineUsers(new Set(uniqueEmails))
          console.log('Updated online users (including self):', uniqueEmails)
          
          // Force conversations to re-render to update status
          setConversations(convs => [...convs])
        })

        socket.on('disconnect', () => {
          console.log('Disconnected from chat server')
        })
      } catch (error) {
        console.error('Failed to initialize socket:', error)
      }
    }

    initSocket()

    return () => {
      // Clear typing state on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (socketRef.current) {
        if (isTyping && selectedConversation) {
          socketRef.current.emit('stop-typing', { conversationId: selectedConversation.id })
        }
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Test database connection and setup
  const testDatabaseSetup = async () => {
    try {
      console.log('Testing database setup...')
      
      // Test if conversations table exists
      const { data: convTest, error: convError } = await supabase
        .from('conversations')
        .select('count')
        .limit(1)
      
      console.log('Conversations table test:', { convTest, convError })
      
      // Test if messages table exists  
      const { data: msgTest, error: msgError } = await supabase
        .from('messages')
        .select('count')
        .limit(1)
        
      console.log('Messages table test:', { msgTest, msgError })
      
      // Skip user lookup test to avoid rate limiting
      console.log('Skipping user lookup test to avoid rate limiting')
      
      if (convError || msgError) {
        console.error('Database setup incomplete:', { convError, msgError })
        return false
      }
      
      console.log('✅ Database setup verified')
      return true
    } catch (error) {
      console.error('Database test failed:', error)
      return false
    }
  }

  // Load conversations
  useEffect(() => {
    if (user) {
      testDatabaseSetup().then(isSetup => {
        if (isSetup) {
          loadConversations()
        } else {
          console.error('❌ Database not set up properly')
        }
      })
    }
  }, [user])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        // Focus search input after state update
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder="Search messages..."]')
          if (searchInput) searchInput.focus()
        }, 100)
      }
      
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
        setSearchQuery('')
      }
      
      // Ctrl/Cmd + N to start new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowNewChatModal(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSearch])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Mark messages as read when user views them
  const markMessagesAsRead = async (conversationId) => {
    if (!conversationId || !user) return

    try {
      console.log('Marking messages as read for conversation:', conversationId)
      
      // Update all unread messages in this conversation that were sent by others
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id) // Only mark messages from others as read
        .is('read_at', null) // Only update unread messages
        .select()

      if (error) {
        console.error('Error marking messages as read:', error)
        return
      }

      console.log('Marked messages as read:', data)

      // Update local state to reflect read status
      if (data && data.length > 0) {
        setMessages(prev => prev.map(msg => {
          const updatedMsg = data.find(d => d.id === msg.id)
          return updatedMsg ? { ...msg, read_at: updatedMsg.read_at } : msg
        }))

        // Emit read receipt to other users via socket
        if (socketRef.current) {
          socketRef.current.emit('messages-read', {
            conversationId,
            messageIds: data.map(d => d.id),
            readAt: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error)
    }
  }

  // Simplified function to get user info by ID (to prevent excessive API calls)
  const getUserById = async (userId) => {
    try {
      // Check cache first
      if (userCache.has(userId)) {
        return userCache.get(userId)
      }

      // For now, return null to avoid excessive API calls
      // User info will be populated from conversation data instead
      console.log('Skipping user lookup to prevent rate limiting for:', userId)
      return null
    } catch (error) {
      console.error('Error in getUserById:', error)
      return null
    }
  }

  const loadConversations = async () => {
    if (!user) return

    try {
      console.log('Loading conversations for user:', user.id)
      
      // First, get conversations with basic data
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      console.log('Raw conversations data:', conversationsData)

      if (!conversationsData || conversationsData.length === 0) {
        console.log('No conversations found')
        setConversations([])
        return
      }

      // For each conversation, get the other user's info
      const formattedConversations = conversationsData.map((conv) => {
        const isParticipant1 = conv.participant1_id === user.id
        const otherUserId = isParticipant1 ? conv.participant2_id : conv.participant1_id
        
        // Try to get email from stored fields first (new conversations)
        let otherUserEmail = isParticipant1 ? conv.participant2_email : conv.participant1_email
        
        console.log('Processing conversation:', conv.id)
        console.log('Other user ID:', otherUserId)
        console.log('Other user email from DB:', otherUserEmail)
        
        if (otherUserEmail) {
          // We have the email stored in the conversation
          console.log('✅ Using stored email:', otherUserEmail)
          return {
            ...conv,
            otherUser: {
              id: otherUserId,
              email: otherUserEmail,
              raw_user_meta_data: {}
            },
            displayName: otherUserEmail
          }
        } else {
          // Fallback: try to get from cache or show loading
          console.log('⚠️ No stored email, checking cache...')
          const cachedUser = userCache.get(otherUserId)
          
          if (cachedUser && cachedUser.email) {
            console.log('✅ Using cached email:', cachedUser.email)
            return {
              ...conv,
              otherUser: {
                id: otherUserId,
                email: cachedUser.email,
                raw_user_meta_data: cachedUser.raw_user_meta_data || {}
              },
              displayName: cachedUser.email
            }
          } else {
            // Show loading and trigger async lookup
            console.log('📡 Triggering async user lookup for:', otherUserId)
            
            // Async lookup (don't wait for it)
            getUserById(otherUserId).then(foundUser => {
              if (foundUser && foundUser.email) {
                console.log('🔄 Async lookup successful, updating conversations...')
                setConversations(prev => prev.map(c => 
                  c.id === conv.id ? {
                    ...c,
                    otherUser: {
                      id: foundUser.id,
                      email: foundUser.email,
                      raw_user_meta_data: foundUser.raw_user_meta_data || {}
                    },
                    displayName: foundUser.email
                  } : c
                ))
              }
            })
            
            return {
              ...conv,
              otherUser: {
                id: otherUserId,
                email: `Loading... (${otherUserId.slice(0, 8)})`,
                raw_user_meta_data: {}
              },
              displayName: `Loading... (${otherUserId.slice(0, 8)})`
            }
          }
        }
      })

      console.log('Formatted conversations:', formattedConversations)
      setConversations(formattedConversations)
      
      // If any conversations have "Loading..." display names, try to refresh them after a delay
      const hasLoadingUsers = formattedConversations.some(conv => 
        conv.displayName.includes('Loading...')
      )
      
      if (hasLoadingUsers) {
        console.log('Some users are still loading, will retry in 2 seconds...')
        setTimeout(() => {
          console.log('Retrying user lookup for loading conversations...')
          loadConversations() // Retry loading conversations
        }, 2000)
      }
      
      // Restore previously selected conversation if it exists
      const savedConversationId = localStorage.getItem('selectedConversationId')
      if (savedConversationId && formattedConversations.length > 0) {
        const savedConversation = formattedConversations.find(conv => conv.id === savedConversationId)
        if (savedConversation) {
          console.log('Restoring selected conversation:', savedConversationId)
          setSelectedConversation(savedConversation)
          loadMessages(savedConversationId)
          
          // Join the conversation for real-time updates
          if (socketRef.current) {
            socketRef.current.emit('join-conversation', savedConversationId)
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadMessages = async (conversationId) => {
    if (!conversationId) return
    
    try {
      console.log('Loading messages for conversation:', conversationId)
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      console.log('Raw messages data:', data)

      // Format messages with sender info (simplified to avoid excessive API calls)
      const formattedMessages = (data || []).map((message) => {
        if (message.sender_id === user.id) {
          // Current user's message
          return {
            ...message,
            sender: {
              id: user.id,
              email: user.email,
              raw_user_meta_data: user.user_metadata || user.raw_user_meta_data || {}
            }
          }
        } else {
          // Other user's message - use conversation info if available
          const otherUserEmail = selectedConversation?.otherUser?.email || 'Other User'
          return {
            ...message,
            sender: {
              id: message.sender_id,
              email: otherUserEmail,
              raw_user_meta_data: {}
            }
          }
        }
      })

      console.log('Formatted messages:', formattedMessages)
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const searchUser = async () => {
    const trimmedEmail = searchEmail.trim()
    
    if (!trimmedEmail) {
      setSearchError('❌ Please enter an email address.')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setSearchError('❌ Please enter a valid email address.')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setSearchSuccess('')

    try {
      // First, try to get the current session to ensure we have proper auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        setSearchError('Authentication error. Please refresh and try again.')
        return
      }

      console.log('Searching for user:', trimmedEmail)
      console.log('Current user:', user?.email)
      console.log('API URL:', `${import.meta.env.VITE_API_BASE_URL}/api/users/search?email=${encodeURIComponent(trimmedEmail)}`)

      // Use backend API to search for users in Supabase auth
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/search?email=${encodeURIComponent(trimmedEmail)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}))
        console.log('404 Error data:', errorData)
        // User not found in Supabase auth - they need to register
        setSearchError(`❌ User with email "${trimmedEmail}" is not registered on CognEdge. Please ask them to sign up first at the registration page.`)
        return
      }
      
      if (!response.ok) {
        // Other error occurred
        const errorData = await response.json().catch(() => ({}))
        console.log('Error response data:', errorData)
        setSearchError(errorData.error || 'Failed to search for user. Please try again.')
        return
      }
      
      // Parse the successful response
      const userData = await response.json()
      console.log('Success response data:', userData)
      const foundUser = userData.user
      console.log('Found user:', foundUser)

      // Check if user is trying to chat with themselves
      if (foundUser.id === user.id) {
        setSearchError('❌ You cannot start a chat with yourself. Please enter a different email address.')
        return
      }

      // Special case: If searching for your own email, show that you're registered but can't chat with yourself
      if (foundUser.email.toLowerCase() === user.email.toLowerCase()) {
        setSearchError('✅ You are registered on CognEdge! However, you cannot start a chat with yourself. Please enter someone else\'s email.')
        return
      }

      // User found and registered - show success message
      const successMessage = `✅ User "${foundUser.email}" is registered on CognEdge! Opening chat...`
      setSearchSuccess(successMessage)
      
      // Brief delay to show success message, then create conversation
      setTimeout(async () => {
        // Ensure the user object has the correct structure
        const normalizedUser = {
          id: foundUser.id,
          email: foundUser.email,
          raw_user_meta_data: foundUser.raw_user_meta_data || {},
          created_at: foundUser.created_at,
          email_confirmed_at: foundUser.email_confirmed_at
        }
        
        // Cache this user for future lookups
        setUserCache(prev => new Map(prev).set(foundUser.id, normalizedUser))
        
        await createConversation(normalizedUser)
      }, 1200)
      
    } catch (error) {
      console.error('Search user error:', error)
      
      // Handle network or other errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setSearchError('❌ Network error. Please check your internet connection and try again.')
      } else {
        setSearchError('❌ An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSearching(false)
    }
  }

  const createConversation = async (otherUser) => {
    try {
      console.log('Creating conversation between:', user.id, 'and', otherUser.id)
      console.log('Current user:', user)
      console.log('Other user:', otherUser)

      // Check if conversation already exists
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUser.id}),and(participant1_id.eq.${otherUser.id},participant2_id.eq.${user.id})`)
        .maybeSingle() // Use maybeSingle instead of single to avoid error when no rows found

      console.log('Existing conversation check:', { existingConv, checkError })

      if (checkError) {
        console.error('Error checking existing conversation:', checkError)
        // Don't return here, continue to create new conversation
      }

      if (existingConv) {
        console.log('Found existing conversation:', existingConv)
        // Conversation exists, select it
        const formattedConv = {
          ...existingConv,
          otherUser,
          displayName: otherUser.raw_user_meta_data?.full_name || otherUser.email
        }
        setSelectedConversation(formattedConv)
        loadMessages(existingConv.id)
        setShowNewChatModal(false)
        setSearchEmail('')
        setSearchError('')
        setSearchSuccess('')
        return
      }

      console.log('Creating new conversation...')
      // Create new conversation with user emails for easier lookup
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: otherUser.id,
          participant1_email: user.email,
          participant2_email: otherUser.email
        })
        .select()
        .single()

      console.log('New conversation result:', { newConv, error })

      if (error) {
        console.error('Error inserting conversation:', error)
        throw error
      }

      // Add to conversations list
      const formattedConv = {
        ...newConv,
        otherUser: {
          id: otherUser.id,
          email: otherUser.email,
          raw_user_meta_data: otherUser.raw_user_meta_data || {}
        },
        displayName: otherUser.raw_user_meta_data?.full_name || otherUser.email
      }

      setConversations(prev => [formattedConv, ...prev])
      setSelectedConversation(formattedConv)
      setShowNewChatModal(false)
      setSearchEmail('')
      setSearchError('')
      setSearchSuccess('')

      // Create notification for new conversation
      try {
        await supabase.from('notifications').insert({
          user_id: otherUser.id,
          type: 'conversation_started',
          content: 'New conversation started',
          sender_user_id: user.id,
          sender_email: user.email,
          context: newConv.id
        })
        console.log('New conversation notification created')
      } catch (notifError) {
        console.warn('Could not create conversation notification:', notifError)
      }

      console.log('Conversation created successfully!')
    } catch (error) {
      console.error('Error creating conversation:', error)
      
      // Provide more specific error messages
      if (error.code === 'PGRST116') {
        setSearchError('❌ Database connection error. Please try again.')
      } else if (error.message?.includes('permission')) {
        setSearchError('❌ Permission denied. Please refresh and try again.')
      } else if (error.message?.includes('unique')) {
        setSearchError('❌ Conversation already exists. Please refresh the page.')
      } else {
        setSearchError(`❌ Failed to create conversation: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const messageContent = newMessage.trim()
    const originalMessage = newMessage
    setNewMessage('')

    // Ensure current user is marked as online when sending messages
    setOnlineUsers(prev => new Set([...prev, user.email]))

    // Clear typing state immediately when sending message
    if (isTyping && socketRef.current) {
      setIsTyping(false)
      socketRef.current.emit('stop-typing', { conversationId: selectedConversation.id })
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }

    try {
      console.log('Sending message:', {
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: messageContent
      })

      // First, let's try a simple insert without the complex select
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: messageContent
        })
        .select()
        .single()

      console.log('Message insert result:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      // Create a formatted message for local state
      const formattedMessage = {
        ...data,
        sender: {
          id: user.id,
          email: user.email,
          raw_user_meta_data: user.user_metadata || user.raw_user_meta_data || {}
        }
      }

      // Add message to local state immediately for sender
      setMessages(prev => [...prev, formattedMessage])

      // Emit to socket for real-time updates to other participants
      if (socketRef.current) {
        console.log('Broadcasting message via socket:', formattedMessage)
        socketRef.current.emit('send-message', {
          conversationId: selectedConversation.id,
          message: {
            ...formattedMessage,
            conversation_id: selectedConversation.id
          }
        })
      }

      // Update conversation's updated_at
      try {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedConversation.id)
      } catch (updateError) {
        console.warn('Failed to update conversation timestamp:', updateError)
        // Don't throw here, message was sent successfully
      }

    } catch (error) {
      console.error('Error sending message:', error)
      
      // Restore the message text so user can try again
      setNewMessage(originalMessage)
      
      // Show user-friendly error message
      if (error.code === 'PGRST116') {
        alert('❌ Database connection error. Please check your internet connection and try again.')
      } else if (error.message?.includes('permission')) {
        alert('❌ Permission denied. Please refresh the page and try again.')
      } else if (error.message?.includes('Failed to fetch')) {
        alert('❌ Network error. Please check your connection and try again.')
      } else if (error.message?.includes('relation') || error.message?.includes('table')) {
        alert('❌ Database not properly set up. Please contact support.')
      } else {
        alert(`❌ Failed to send message: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const sendFileMessage = async (fileData) => {
    if (!selectedConversation) return

    try {
      console.log('Sending file message:', fileData)

      // Insert file message into database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: `📎 ${fileData.fileName}`,
          message_type: 'file',
          file_url: fileData.fileUrl,
          file_name: fileData.fileName,
          file_size: fileData.fileSize,
          file_type: fileData.fileType
        })
        .select()
        .single()

      if (error) {
        console.error('Error sending file message:', error)
        throw error
      }

      // Create formatted message for local state
      const formattedMessage = {
        ...data,
        sender: {
          id: user.id,
          email: user.email,
          raw_user_meta_data: user.user_metadata || user.raw_user_meta_data || {}
        }
      }

      // Add message to local state
      setMessages(prev => [...prev, formattedMessage])

      // Emit to socket for real-time updates
      if (socketRef.current) {
        console.log('Broadcasting file message via socket:', formattedMessage)
        socketRef.current.emit('send-message', {
          conversationId: selectedConversation.id,
          message: {
            ...formattedMessage,
            conversation_id: selectedConversation.id
          }
        })
      }

      // Create notification for file sharing
      try {
        const recipientId = selectedConversation.otherUser.id || 
          (selectedConversation.participant1_id === user.id 
            ? selectedConversation.participant2_id 
            : selectedConversation.participant1_id)

        await supabase.from('notifications').insert({
          user_id: recipientId,
          type: 'file_shared',
          content: fileData.fileName,
          sender_user_id: user.id,
          sender_email: user.email,
          context: selectedConversation.id
        })
        console.log('File sharing notification created')
      } catch (notifError) {
        console.warn('Could not create file sharing notification:', notifError)
      }

      // Update conversation timestamp
      try {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', selectedConversation.id)
      } catch (updateError) {
        console.warn('Failed to update conversation timestamp:', updateError)
      }

    } catch (error) {
      console.error('Error sending file message:', error)
      alert('Failed to send file. Please try again.')
    }
  }

  const handleTyping = () => {
    if (!selectedConversation || !socketRef.current) return

    // Don't start typing if we're not actually typing (empty input)
    if (!newMessage.trim()) return

    // Send typing event only if not already typing
    if (!isTyping) {
      setIsTyping(true)
      socketRef.current.emit('typing', { conversationId: selectedConversation.id })
      console.log('Started typing indicator')
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing (shorter timeout for better UX)
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        if (socketRef.current && selectedConversation) {
          socketRef.current.emit('stop-typing', { conversationId: selectedConversation.id })
          console.log('Stopped typing indicator (timeout)')
        }
      }
    }, 1500) // Reduced from 2000ms to 1500ms
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
      // Note: sendMessage() already handles clearing typing state
    } else if (e.key !== 'Enter') {
      // Only trigger typing for actual content keys, not Enter
      handleTyping()
    }
  }

  const selectConversation = (conversation) => {
    console.log('Selecting conversation:', conversation.id)
    
    // Mark both users as online when opening a conversation
    setOnlineUsers(prev => {
      const newSet = new Set([...prev, user.email])
      if (conversation.otherUser?.email) {
        newSet.add(conversation.otherUser.email)
      }
      return newSet
    })
    
    // Clear typing state when switching conversations
    if (isTyping && socketRef.current && selectedConversation) {
      setIsTyping(false)
      socketRef.current.emit('stop-typing', { conversationId: selectedConversation.id })
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      console.log('Cleared typing state when switching conversations')
    }
    
    // Leave previous conversation
    if (selectedConversation && socketRef.current) {
      console.log('Leaving previous conversation:', selectedConversation.id)
      socketRef.current.emit('leave-conversation', selectedConversation.id)
    }
    
    setSelectedConversation(conversation)
    loadMessages(conversation.id)
    
    // Mark messages as read when opening conversation
    setTimeout(() => {
      markMessagesAsRead(conversation.id)
    }, 500) // Small delay to ensure messages are loaded first
    
    // Save selected conversation to localStorage
    localStorage.setItem('selectedConversationId', conversation.id)
    
    // Join new conversation for real-time updates
    if (socketRef.current) {
      console.log('Joining conversation:', conversation.id)
      socketRef.current.emit('join-conversation', conversation.id)
    }
  }

  // File handling functions
  const handleFileSelect = async (files) => {
    const file = files[0]
    if (!file) return

    // Check file size (limit to 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB')
      return
    }

    if (!selectedConversation) {
      alert('Please select a conversation first')
      return
    }

    try {
      console.log('Uploading file:', file.name, 'Size:', file.size)
      
      // Show uploading status
      const uploadingMessage = `📤 Uploading ${file.name}...`
      setNewMessage(uploadingMessage)

      // Create unique filename with user ID and timestamp
      const fileExtension = file.name.split('.').pop()
      const uniqueFileName = `${user.id}/${Date.now()}_${file.name}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('Failed to upload file. Please try again.')
        setNewMessage('')
        return
      }

      console.log('File uploaded successfully:', uploadData)

      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(uniqueFileName)

      console.log('File public URL:', publicUrl)

      // Send file message to database
      await sendFileMessage({
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream'
      })

      // Clear the uploading message
      setNewMessage('')

    } catch (error) {
      console.error('Error handling file upload:', error)
      alert('Failed to upload file. Please try again.')
      setNewMessage('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(message => 
        message.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-900 rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-white">Chats</h2>
            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={socketConnected ? 'Connected' : 'Disconnected'}></div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                console.log('=== DEBUG INFO ===')
                console.log('Current user email:', user?.email)
                console.log('Online users:', Array.from(onlineUsers))
                console.log('Socket connected:', socketConnected)
                console.log('Is current user online?', onlineUsers.has(user?.email))
                console.log('==================')
                setUserCache(new Map()) // Clear cache
                loadConversations() // Reload conversations
              }}
              className="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center text-white text-sm transition-colors"
              title="Refresh user data"
            >
              🔄
            </button>
            <div className="text-xs text-gray-400 hidden sm:block">
              Ctrl+N
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white text-xl transition-colors"
              title="Start new chat (Ctrl+N)"
            >
              +
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <div className="animate-pulse">
                <p>Loading conversations...</p>
              </div>
              <p className="text-sm mt-2">Or click the + button to start a new chat</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {conversation.displayName.charAt(0).toUpperCase()}
                    </div>
                    {/* Online/Offline Status Indicator */}
                    <div className={`absolute -bottom-0 -right-0 w-4 h-4 border-2 border-gray-800 rounded-full ${
                      onlineUsers.has(conversation.otherUser.email) 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`} title={onlineUsers.has(conversation.otherUser.email) ? 'Online' : 'Offline'}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium truncate">
                        {conversation.displayName}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        onlineUsers.has(conversation.otherUser.email) || conversation.otherUser.email === user.email
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {onlineUsers.has(conversation.otherUser.email) || conversation.otherUser.email === user.email ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">
                      {conversation.otherUser.email}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {selectedConversation.displayName.charAt(0).toUpperCase()}
                    </div>
                    {/* Online/Offline Status Indicator */}
                    <div className={`absolute -bottom-0 -right-0 w-4 h-4 border-2 border-gray-800 rounded-full ${
                      onlineUsers.has(selectedConversation.otherUser.email) 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`} title={onlineUsers.has(selectedConversation.otherUser.email) ? 'Online' : 'Offline'}></div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">{selectedConversation.displayName}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        onlineUsers.has(selectedConversation.otherUser.email) || selectedConversation.otherUser.email === user.email
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {onlineUsers.has(selectedConversation.otherUser.email) || selectedConversation.otherUser.email === user.email ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{selectedConversation.otherUser.email}</p>
                  </div>
                </div>
                
                {/* Search Button */}
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-400 hidden sm:block">
                    Ctrl+K
                  </div>
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                    title="Search messages (Ctrl+K)"
                  >
                    🔍
                  </button>
                </div>
              </div>
              
              {/* Search Input */}
              {showSearch && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Messages */}
            <div 
              className={`flex-1 overflow-y-auto p-4 space-y-4 relative ${dragOver ? 'bg-blue-900/20 border-2 border-dashed border-blue-500' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-900/30 backdrop-blur-sm z-10">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2">📎</div>
                    <p className="text-lg font-medium">Drop file to share</p>
                    <p className="text-sm opacity-70">PDFs, Images, Documents - Max 25MB</p>
                  </div>
                </div>
              )}
              {searchQuery.trim() && (
                <div className="text-center text-gray-400 text-sm mb-4">
                  {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} found for "{searchQuery}"
                </div>
              )}
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {message.message_type === 'file' ? (
                      // File message display
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">
                            {message.file_type?.startsWith('image/') ? '🖼️' :
                             message.file_type?.includes('pdf') ? '📄' :
                             message.file_type?.includes('video') ? '🎥' :
                             message.file_type?.includes('audio') ? '🎵' :
                             message.file_type?.includes('zip') || message.file_type?.includes('rar') ? '📦' :
                             '📎'}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{message.file_name}</p>
                            <p className="text-xs opacity-70">
                              {message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(2)} MB` : 'File'}
                            </p>
                          </div>
                        </div>
                        {message.file_url && (
                          <div className="flex space-x-2">
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Open
                            </a>
                            <a
                              href={message.file_url}
                              download={message.file_name}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Regular text message
                      <p>
                        {searchQuery.trim() ? (
                          message.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, index) =>
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={index} className="bg-yellow-400 text-black px-1 rounded">
                                {part}
                              </mark>
                            ) : (
                              part
                            )
                          )
                        ) : (
                          message.content
                        )}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs opacity-70">
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {message.sender_id === user.id && (
                        <div className="flex items-center space-x-1">
                          <span 
                            className={`text-xs ${
                              message.read_at 
                                ? 'text-blue-400' // Blue when read
                                : 'text-white opacity-70' // White when unread
                            }`}
                            title={message.read_at ? `Read ${new Date(message.read_at).toLocaleString()}` : 'Delivered'}
                          >
                            ✓✓
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-white px-4 py-2 rounded-lg max-w-xs">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-300">
                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                  title="Attach file"
                >
                  📎
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value
                    setNewMessage(value)
                    
                    // If input becomes empty, stop typing immediately
                    if (!value.trim() && isTyping && socketRef.current) {
                      setIsTyping(false)
                      socketRef.current.emit('stop-typing', { conversationId: selectedConversation.id })
                      if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                        typingTimeoutRef.current = null
                      }
                      console.log('Stopped typing (input empty)')
                    } else if (value.trim()) {
                      handleTyping()
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                accept="*/*"
                multiple={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Select a chat to start messaging</p>
              <p className="text-sm">Or click the + button to start a new conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Start New Chat</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter registered user's email
                </label>
                <div className="bg-blue-900/20 border border-blue-500/20 rounded p-3 mb-3">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Note:</strong> The user must already have a CognEdge account. If they don't have one, ask them to sign up first.
                  </p>
                </div>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value)
                    setSearchError('')
                    setSearchSuccess('')
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && !isSearching && searchEmail.trim() && searchUser()}
                  placeholder="colleague@company.com"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchError && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-500/20 rounded text-red-400 text-sm">
                    {searchError}
                  </div>
                )}
                {searchSuccess && (
                  <div className="mt-2 p-3 bg-green-900/20 border border-green-500/20 rounded text-green-400 text-sm">
                    {searchSuccess}
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowNewChatModal(false)
                    setSearchEmail('')
                    setSearchError('')
                    setSearchSuccess('')
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                  disabled={isSearching}
                >
                  Cancel
                </button>
                <button
                  onClick={searchUser}
                  disabled={!searchEmail.trim() || isSearching}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </span>
                  ) : (
                    'Find & Chat'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
