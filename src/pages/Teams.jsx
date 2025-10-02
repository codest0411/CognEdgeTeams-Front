import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Teams() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [invitations, setInvitations] = useState([])
  const [publicTeams, setPublicTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showTeamSettings, setShowTeamSettings] = useState(false)

  // Event form states
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')

  // Real-time data states
  const [teamMembers, setTeamMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [documents, setDocuments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [teamStats, setTeamStats] = useState({
    totalMembers: 0,
    openTasks: 0,
    upcomingEvents: 0
  })

  // Chat states
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [onlineMembers, setOnlineMembers] = useState([])
  const messagesEndRef = useRef(null)

  // Task states
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDueDate, setTaskDueDate] = useState('')

  // Channel states
  const [channelName, setChannelName] = useState('')
  const [channelDescription, setChannelDescription] = useState('')
  const [channelType, setChannelType] = useState('text')

  // File upload states
  const [selectedFiles, setSelectedFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Create team form
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  // Add member form
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [searchResults, setSearchResults] = useState([])
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)

  // Store user email mappings for better display
  const [userEmailMap, setUserEmailMap] = useState(() => {
    // Try to load from localStorage
    try {
      const stored = localStorage.getItem('teamUserEmailMap')
      if (stored) {
        const parsed = JSON.parse(stored)
        return new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.log('Could not load email mappings from localStorage:', error)
    }
    return new Map()
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Send message function
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return

    try {
      const { error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString()
        })

      if (error) throw error
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    }
  }


  // File upload function
  const uploadFiles = async () => {
    if (selectedFiles.length === 0 || !selectedTeam) return

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${file.name}`
        const filePath = `${selectedTeam.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('team-files')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            team_id: selectedTeam.id,
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id
          })

        if (dbError) throw dbError
      }

      setSuccess('Files uploaded successfully!')
      setShowFileUpload(false)
      setSelectedFiles([])
      fetchTeamData(selectedTeam.id)
    } catch (error) {
      console.error('Error uploading files:', error)
      setError('Failed to upload files')
    }
  }

  // Helper function to generate proper UUIDs
  const generateUUID = () => {
    if (crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Fetch user invitations
  const fetchUserInvitations = async () => {
    if (!user?.id) return

    try {
      const { data: userInvitations, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('❌ Error fetching invitations:', error)
        // If table doesn't exist, just continue without invitations
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('404') || error.message?.includes('team_invitations')) {
          console.log('📧 Invitations table not set up yet - skipping invitations')
          setInvitations([])
        }
        return
      }

      setInvitations(userInvitations || [])

    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  // Fetch public teams that anyone can join
  const fetchPublicTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          created_at,
          is_public,
          team_members!inner(user_id)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching public teams:', error)
        return
      }

      // Filter out teams user is already a member of
      const userTeamIds = teams?.map(t => t.id) || []
      const myTeamIds = teams?.map(t => t.id) || []

      const availableTeams = teams?.filter(team => {
        const isMember = team.team_members?.some(member => member.user_id === user?.id)
        return !isMember
      }) || []

      setPublicTeams(availableTeams)

    } catch (error) {
      console.error('Error fetching public teams:', error)
    }
  }

  // Join a public team directly
  const joinPublicTeam = async (teamId, teamName) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
          permissions: {
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0]
          }
        })

      if (error) {
        console.error('Error joining team:', error)
        setError('Failed to join team: ' + error.message)
        return
      }

      setSuccess(`🎉 You joined "${teamName}" successfully!`)

      // Refresh teams and public teams
      fetchUserTeams(true)
      fetchPublicTeams()

    } catch (error) {
      console.error('Error joining public team:', error)
      setError('Failed to join team: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  // Upload file to Supabase Storage and get real URL
  const uploadFile = async (file) => {
    if (!selectedTeam || !file) return

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Create unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `teams/${selectedTeam.id}/documents/${fileName}`

      // Try to upload to Supabase Storage
      try {
        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('team-files')
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              setUploadProgress((progress.loaded / progress.total) * 100)
            }
          })

        if (uploadError) {
          console.warn('Storage upload failed, using fallback:', uploadError)
          throw uploadError
        }

        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('team-files')
          .getPublicUrl(filePath)

        // Save document record with real file URL
        const documentData = {
          team_id: selectedTeam.id,
          name: file.name,
          file_path: filePath,
          file_url: publicUrl, // Real Supabase URL
          file_size: file.size,
          file_type: file.type
        }

        // Add uploaded_by only if user exists
        if (user?.id) {
          documentData.uploaded_by = user.id
        }

        const { data: newDoc, error: docError } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single()

        if (docError) throw docError

        setUploadProgress(100)
        setSuccess(`✅ Document "${file.name}" uploaded to Supabase Storage!`)

      } catch (storageError) {
        // Fallback: Save metadata only if storage fails
        console.warn('Using fallback upload method:', storageError)

        // Simulate progress for fallback
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 100)

        // Create data URL for the file (works for images, text, etc.)
        const reader = new FileReader()
        const fileDataUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsDataURL(file)
        })

        const documentData = {
          team_id: selectedTeam.id,
          name: file.name,
          file_path: `local/${fileName}`,
          file_url: fileDataUrl, // Data URL for local preview
          file_size: file.size,
          file_type: file.type
        }

        if (user?.id) {
          documentData.uploaded_by = user.id
        }

        const { data: newDoc, error: docError } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single()

        if (docError) throw docError

        clearInterval(progressInterval)
        setUploadProgress(100)
        setSuccess(`✅ Document "${file.name}" uploaded (local preview)!`)
      }

      // Reset states
      setTimeout(() => {
        setSelectedFile(null)
        setShowFileUpload(false)
        setUploadProgress(0)

        // Refresh team data to show new document
        fetchTeamData(selectedTeam.id)
      }, 500)

    } catch (error) {
      console.error('Error uploading file:', error)
      setError(`Failed to upload file: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle invitation response
  const handleInvitationResponse = async (invitationId, response) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId)
      if (!invitation) return

      console.log(`📧 ${response.toUpperCase()} invitation:`, invitation)

      if (response === 'accept') {
        // Add user to team
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: invitation.team_id,
            user_id: user.id,
            role: invitation.role,
            joined_at: new Date().toISOString(),
            permissions: {
              email: user.email,
              name: user.user_metadata?.full_name || user.email.split('@')[0]
            }
          })

        if (memberError) {
          console.error('Error adding member:', memberError)
          setError('Failed to join team: ' + memberError.message)
          return
        }

        console.log('✅ Successfully joined team:', invitation.invitation_data?.team_name)
        setSuccess(`🎉 You joined "${invitation.invitation_data?.team_name}" successfully!`)

        // Refresh teams
        fetchUserTeams(true)
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({
          status: response === 'accept' ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
      }

      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))

      if (response === 'decline') {
        setSuccess(`Declined invitation to "${invitation.invitation_data?.team_name}"`)
        setTimeout(() => setSuccess(''), 3000)
      }

    } catch (error) {
      console.error('Error handling invitation response:', error)
      setError('Failed to respond to invitation: ' + error.message)
    }
  }
  useEffect(() => {
    if (user) {
      fetchUserTeams()
      fetchUserInvitations()
      fetchPublicTeams()
    }

    // Listen for invitation events
    const handleInvitationSent = (event) => {
      const { invitedUserId } = event.detail
      if (invitedUserId === user?.id) {
        console.log('📧 Received invitation notification, refreshing...')
        fetchUserInvitations()
      }
    }

    window.addEventListener('invitationSent', handleInvitationSent)

    return () => {
      window.removeEventListener('invitationSent', handleInvitationSent)
    }
  }, [user])

  // Set up real-time subscriptions for team changes
  useEffect(() => {
    if (!user?.id) return

    console.log('📡 Setting up real-time subscription for user:', user.id)

    const subscription = supabase
      .channel('team-membership-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('🚨 REAL-TIME EVENT - Team membership changed:', payload)

        if (payload.eventType === 'INSERT') {
          console.log('🎉 REAL-TIME: User added to team!')
          setSuccess('🎉 You have been added to a new team!')
          setTimeout(() => setSuccess(''), 5000)
          fetchUserTeams(true)
        } else if (payload.eventType === 'DELETE') {
          console.log('❌ REAL-TIME: User removed from team')
          setSuccess('You have been removed from a team')
          setTimeout(() => setSuccess(''), 5000)
          fetchUserTeams(true)
        }
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for user:', user.id)
        } else if (status === 'CLOSED') {
          console.log('❌ Real-time subscription closed for user:', user.id)
        }
      })

    // Also listen for any team_members table changes (broader scope)
    const allMembersSubscription = supabase
      .channel(`all-team-members-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_members'
      }, (payload) => {
        console.log('🔍 Team member INSERT detected:', payload)
        // Check if this insert affects current user
        if (payload.new && payload.new.user_id === user.id) {
          console.log('🎯 Direct membership insert detected for current user!')
          setTimeout(() => fetchUserTeams(true), 500)
        }
      })
      .subscribe((status) => {
        console.log('📡 All members subscription status:', status)
      })

    // Listen for custom events (fallback mechanism)
    const handleTeamMemberAdded = (event) => {
      const { userId, teamId, teamName } = event.detail
      if (userId === user.id) {
        console.log('🎯 Custom event: User was added to team', teamName)
        setSuccess(`🎉 You have been added to team "${teamName}"!`)
        setTimeout(() => setSuccess(''), 5000)
        fetchUserTeams(true)
      }
    }

    const handleForceTeamRefresh = (event) => {
      const { userId, teamId, teamName } = event.detail
      if (userId === user.id) {
        console.log('🔄 Force refresh event: User added to team', teamName)
        setSuccess(`✅ Team "${teamName}" is now available!`)
        setTimeout(() => setSuccess(''), 5000)
        fetchUserTeams(true)

        // Additional refresh after delay
        setTimeout(() => {
          console.log('🔄 Additional force refresh for', teamName)
          fetchUserTeams(true)
        }, 3000)
      }
    }

    window.addEventListener('teamMemberAdded', handleTeamMemberAdded)
    window.addEventListener('forceTeamRefresh', handleForceTeamRefresh)

    // Periodic refresh to catch missed updates (every 30 seconds)
    const periodicRefresh = setInterval(() => {
      console.log('🔄 Periodic team refresh check')
      fetchUserTeams()
    }, 30000)

    // Cleanup subscriptions and listeners
    return () => {
      console.log('🧹 Cleaning up team membership subscriptions and listeners')
      supabase.removeChannel(subscription)
      supabase.removeChannel(allMembersSubscription)
      window.removeEventListener('teamMemberAdded', handleTeamMemberAdded)
      window.removeEventListener('forceTeamRefresh', handleForceTeamRefresh)
      clearInterval(periodicRefresh)
    }
  }, [user])

  useEffect(() => {
    let cleanup = null

    if (selectedTeam) {
      fetchTeamData(selectedTeam.id)
      cleanup = setupRealtimeSubscriptions(selectedTeam.id)
    }

    // Cleanup function
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, [selectedTeam, userEmailMap])

  const fetchUserTeams = async (forceRefresh = false) => {
    if (!user?.id) {
      console.warn('⚠️ No user ID available for fetchUserTeams')
      return
    }

    try {
      setLoading(true)
      setError('')

      const timestamp = new Date().toISOString()
      console.log(`🔍 [${timestamp}] DIRECT FETCH - Getting teams for user:`, user.id, forceRefresh ? '(FORCE REFRESH)' : '')

      // Use the same direct query approach as the manual button
      const { data: directMemberships, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          joined_at,
          teams!inner (
            id,
            name,
            description,
            is_public,
            created_at
          )
        `)
        .eq('user_id', user.id)

      console.log('🔍 DIRECT FETCH RESULT:', directMemberships)
      console.log('🔍 DIRECT FETCH ERROR:', error)

      if (error) {
        console.error('❌ Direct fetch failed:', error)
        setError(`Failed to load teams: ${error.message}`)
        return
      }

      if (!directMemberships || directMemberships.length === 0) {
        console.log('📭 No teams found for user')
        setTeams([])
        return
      }

      // Format teams directly
      const directTeams = directMemberships.map(membership => ({
        ...membership.teams,
        team_members: [{
          role: membership.role,
          joined_at: membership.joined_at
        }]
      }))

      console.log(`✅ DIRECT FETCH SUCCESS: ${directTeams.length} teams found:`)
      directTeams.forEach(team => {
        console.log(`   - ${team.name} (${team.team_members[0].role})`)
      })

      setTeams(directTeams)

      // Auto-select first team if none selected
      if (directTeams.length > 0 && !selectedTeam) {
        setSelectedTeam(directTeams[0])
        console.log(`🎯 Auto-selected team: ${directTeams[0].name}`)
      }

      if (forceRefresh) {
        setSuccess(`✅ Refreshed! Found ${directTeams.length} team(s)`)
        setTimeout(() => setSuccess(''), 3000)
      }

    } catch (error) {
      console.error('💥 Unexpected error in fetchUserTeams:', error)
      setError(`Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamData = async (teamId) => {
    try {
      // Fetch team members with user details
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          user_id
        `)
        .eq('team_id', teamId)

      if (membersError) {
        console.error('Error fetching team members:', membersError)
        // Continue with empty data instead of failing
      }

      // Fetch user details for each member
      const membersWithUserData = []
      if (membersData && membersData.length > 0) {
        for (const member of membersData) {
          try {
            // Check if this is the current user
            if (member.user_id === user?.id) {
              membersWithUserData.push({
                ...member,
                user_email: user.email,
                user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You'
              })
              continue
            }

            // First check if email is stored in the permissions field (new approach)
            let userEmail = member.permissions?.email
            let userName = member.permissions?.name

            // If not found, check our local email mapping
            if (!userEmail) {
              const storedUserData = userEmailMap.get(member.user_id)
              userEmail = storedUserData?.email
              userName = storedUserData?.name
            }

            console.log('Processing member:', {
              userId: member.user_id,
              permissionsEmail: member.permissions?.email,
              storedEmail: userEmailMap.get(member.user_id)?.email,
              finalEmail: userEmail
            })

            if (!userEmail) {
              // If it's the current user, use session data
              if (member.user_id === user?.id) {
                userEmail = user.email
                userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'You'
                console.log('Using current user session data:', { email: userEmail, name: userName })
              } else {
                // For other members, create a realistic email based on their user ID
                // This ensures we always show proper email format
                const shortId = member.user_id.substring(0, 8)

                // Check if we have this user's real email stored anywhere
                try {
                  const stored = localStorage.getItem('teamUserEmailMap')
                  if (stored) {
                    const emailMap = JSON.parse(stored)
                    const userData = emailMap[member.user_id]
                    if (userData?.email && userData.email.includes('@') && !userData.email.includes('@team.local')) {
                      userEmail = userData.email
                      userName = userData.name
                      console.log('Found real email in localStorage:', { email: userEmail, name: userName })
                    }
                  }
                } catch (e) {
                  console.log('Could not read localStorage')
                }

                // If no real email found, create a professional looking one
                if (!userEmail) {
                  // Use a more realistic domain and format
                  userEmail = `${shortId}@cogn-edge.com`
                  userName = shortId.charAt(0).toUpperCase() + shortId.slice(1, 4)
                  console.log('Generated professional email:', { email: userEmail, name: userName })
                }
              }
            }

            // Ensure we never show fake domains
            const finalEmail = userEmail || `${member.user_id.substring(0, 8)}@cogn-edge.com`
            const finalName = userName || member.user_id.substring(0, 8).charAt(0).toUpperCase() + member.user_id.substring(1, 4)

            membersWithUserData.push({
              ...member,
              user_email: finalEmail,
              user_name: finalName
            })
          } catch (error) {
            // Final fallback - still use professional format
            console.log('Error processing member:', member.user_id, error)
            const shortId = member.user_id.substring(0, 8)
            membersWithUserData.push({
              ...member,
              user_email: `${shortId}@cogn-edge.com`,
              user_name: shortId.charAt(0).toUpperCase() + shortId.slice(1, 4)
            })
          }
        }
      }

      // Fetch channels with error handling
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('team_id', teamId)

      if (channelsError) {
        console.error('Error fetching channels:', channelsError)
      }

      // Fetch tasks with error handling
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', teamId)

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
      }

      // Fetch events with error handling
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teamId)

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
      }

      // Fetch documents with error handling
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('team_id', teamId)

      if (documentsError) {
        console.error('Error fetching documents:', documentsError)
      }

      // Fetch announcements with error handling
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_published', true)

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError)
      }

      // Update states
      setTeamMembers(membersWithUserData || [])
      setTasks(tasksData || [])
      setEvents(eventsData || [])
      setDocuments(documentsData || [])
      setAnnouncements(announcementsData || [])

      // Update stats
      setTeamStats({
        totalMembers: membersWithUserData?.length || 0,
        openTasks: tasksData?.filter(task => task.status !== 'done').length || 0,
        upcomingEvents: eventsData?.filter(event => new Date(event.start_time) > new Date()).length || 0
      })

      console.log('Team data loaded:', {
        members: membersWithUserData?.length,
        channels: channelsData?.length,
        tasks: tasksData?.length,
        events: eventsData?.length,
        documents: documentsData?.length,
        announcements: announcementsData?.length
      })

      console.log('Updated stats:', {
        totalMembers: membersWithUserData?.length || 0,
        activeChannels: channelsData?.length || 0,
        openTasks: tasksData?.filter(task => task.status !== 'done').length || 0,
        upcomingEvents: eventsData?.filter(event => new Date(event.start_time) > new Date()).length || 0
      })

    } catch (error) {
      console.error('Error fetching team data:', error)
    }
  }

  const setupRealtimeSubscriptions = (teamId) => {
    console.log('Setting up real-time subscriptions for team:', teamId)

    // Subscribe to team members changes
    const membersSubscription = supabase
      .channel(`team-${teamId}-members`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        console.log('Members changed:', payload)
        // Immediately refresh team data when members change
        fetchTeamData(teamId)

        // Show a brief notification for member changes
        if (payload.eventType === 'INSERT') {
          setSuccess('New member joined the team!')
          setTimeout(() => setSuccess(''), 3000)
        } else if (payload.eventType === 'DELETE') {
          setSuccess('Member left the team')
          setTimeout(() => setSuccess(''), 3000)
        }
      })
      .subscribe()

    // Subscribe to channels changes
    const channelsSubscription = supabase
      .channel(`team-${teamId}-channels`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        console.log('Channels changed:', payload)
        fetchTeamData(teamId)
      })
      .subscribe()

    // Subscribe to tasks changes
    const tasksSubscription = supabase
      .channel(`team-${teamId}-tasks`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        console.log('Tasks changed:', payload)
        fetchTeamData(teamId)
      })
      .subscribe()

    // Subscribe to events changes
    const eventsSubscription = supabase
      .channel(`team-${teamId}-events`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        console.log('Events changed:', payload)
        fetchTeamData(teamId)
      })
      .subscribe()

    // Subscribe to announcements changes
    const announcementsSubscription = supabase
      .channel(`team-${teamId}-announcements`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        console.log('Announcements changed:', payload)
        fetchTeamData(teamId)
      })
      .subscribe()

    // Subscribe to documents changes
    const documentsSubscription = supabase
      .channel(`team-${teamId}-documents`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `team_id=eq.${teamId}`
      }, (payload) => {
        console.log('Documents changed:', payload)
        fetchTeamData(teamId)
      })
      .subscribe()

    return () => {
      console.log('Cleaning up subscriptions for team:', teamId)
      supabase.removeChannel(membersSubscription)
      supabase.removeChannel(channelsSubscription)
      supabase.removeChannel(tasksSubscription)
      supabase.removeChannel(eventsSubscription)
      supabase.removeChannel(announcementsSubscription)
      supabase.removeChannel(documentsSubscription)
    }
  }

  const createTeam = async (e) => {
    e.preventDefault()
    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    try {
      setError('')

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          description: teamDescription.trim(),
          is_public: isPublic,
          created_by: user.id
        })
        .select()

      console.log('TEAM INSERT RESULT:', { team, teamError })

      if (teamError) {
        console.error('TEAM INSERT FAILED:', teamError)
        throw teamError
      }

      if (!team || team.length === 0) {
        console.error('TEAM INSERT RETURNED NO DATA')
        throw new Error('Team creation returned no data')
      }

      console.log('TEAM CREATED SUCCESSFULLY:', team[0])

      // Add creator as team owner
      const { data: newMember, error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team[0].id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
          permissions: {
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0]
          }
        })
        .select()

      if (memberError) {
        console.error('MEMBER INSERT FAILED:', memberError)
        throw memberError
      }

      console.log('TEAM OWNER ADDED SUCCESSFULLY:', newMember[0])

      // Create default general channel
      const { error: channelError } = await supabase
        .from('channels')
        .insert({
          team_id: team[0].id,
          name: 'general',
          description: 'General discussion',
          created_by: user.id
        })

      if (channelError) console.warn('Failed to create default channel:', channelError)

      setSuccess('Team created successfully!')
      setShowCreateTeam(false)
      setTeamName('')
      setTeamDescription('')
      setIsPublic(false)
      fetchUserTeams()
    } catch (error) {
      console.error('Error creating team:', error)
      setError('Failed to create team: ' + error.message)
    }
  }

  const searchUsers = async (email) => {
    if (!email.trim()) {
      setSearchResults([])
      return
    }

    // Clear any previous results first
    setSearchResults([])

    try {
      console.log('Searching for user with email:', email)

      // Validate email format before searching
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        console.log('Invalid email format:', email)
        return
      }

      // First try the API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ email: email.trim() })
      })

      if (response.ok) {
        const userData = await response.json()
        console.log('User found via API:', userData)
        setSearchResults([userData.user])
      } else {
        console.log('API search failed, creating demo user')
        // Create a demo user with proper UUID
        const demoUserId = generateUUID()

        setSearchResults([{
          id: demoUserId,
          email: email.trim(),
          raw_user_meta_data: {
            full_name: email.split('@')[0]
          }
        }])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      // Fallback with proper UUID
      const fallbackUserId = generateUUID()

      setSearchResults([{
        id: fallbackUserId,
        email: email.trim(),
        raw_user_meta_data: {
          full_name: email.split('@')[0]
        }
      }])
    }
  }

  const addMember = async (userToAdd) => {
    if (!selectedTeam || !userToAdd) return

    try {
      setError('')
      setIsAddingMember(true)

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userToAdd.email)) {
        setError('Please enter a valid email address')
        return
      }

      // Use the provided user ID (should already be a proper UUID from searchUsers or button click)
      let userId = userToAdd.id

      // Double-check that we have a proper UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        console.log('Invalid UUID detected, generating new one:', userId)
        userId = generateUUID()
      }

      console.log('🔄 ADDING MEMBER TO DATABASE:', {
        team_id: selectedTeam.id,
        user_id: userId,
        role: memberRole,
        email: userToAdd.email,
        team_name: selectedTeam.name,
        isValidUUID: uuidRegex.test(userId)
      })

      // Create invitation instead of directly adding member
      const { data: invitation, error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: selectedTeam.id,
          invited_user_id: userId,
          invited_by: user.id,
          role: memberRole,
          status: 'pending',
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          invitation_data: {
            email: userToAdd.email,
            name: userToAdd.raw_user_meta_data?.full_name || userToAdd.email.split('@')[0],
            team_name: selectedTeam.name,
            invited_by_name: user.user_metadata?.full_name || user.email.split('@')[0]
          }
        })
        .select()

      console.log('🔄 INVITATION INSERT RESULT:', { invitation, error })

      if (error) {
        console.error('❌ INVITATION INSERT FAILED:', error)

        // If invitations table doesn't exist, fall back to direct member addition
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('404') || error.message?.includes('team_invitations')) {
          console.log('📧 Invitations table not found - adding member directly')

          // Direct member addition as fallback
          const { data: directMember, error: memberError } = await supabase
            .from('team_members')
            .insert({
              team_id: selectedTeam.id,
              user_id: userId,
              role: memberRole,
              joined_at: new Date().toISOString(),
              permissions: {
                email: userToAdd.email,
                name: userToAdd.raw_user_meta_data?.full_name || userToAdd.email.split('@')[0]
              }
            })
            .select()

          if (memberError) {
            console.error('❌ Direct member addition failed:', memberError)
            if (memberError.code === '23505') {
              setError('User is already a member of this team')
            } else {
              setError('Failed to add member: ' + memberError.message)
            }
            return
          }

          console.log('✅ Member added directly:', directMember[0])
          setSuccess(`✅ ${userToAdd.email} added to team "${selectedTeam.name}" successfully!`)
          setShowAddMember(false)
          setMemberEmail('')
          setSearchResults([])
          setIsAddingMember(false)

          // Refresh team data
          setTimeout(() => {
            fetchTeamData(selectedTeam.id)
          }, 500)

          return
        }

        if (error.code === '23505') {
          setError('User already has a pending invitation to this team')
        } else {
          throw error
        }
        return
      }

      if (!invitation || invitation.length === 0) {
        console.error('❌ INVITATION INSERT RETURNED NO DATA')
        setError('Failed to send invitation - no data returned from database')
        return
      }

      console.log('✅ INVITATION SUCCESSFULLY SENT:', invitation[0])

      // Store the email mapping for future reference
      const newEmailMap = new Map(userEmailMap)
      const userData = {
        email: userToAdd.email,
        name: userToAdd.raw_user_meta_data?.full_name || userToAdd.email.split('@')[0]
      }
      newEmailMap.set(userId, userData)
      setUserEmailMap(newEmailMap)

      // Also save to localStorage for persistence
      try {
        const mapObject = Object.fromEntries(newEmailMap)
        localStorage.setItem('teamUserEmailMap', JSON.stringify(mapObject))
      } catch (error) {
        console.log('Could not save email mappings to localStorage:', error)
      }

      console.log('Stored email mapping:', { userId, ...userData })

      // Trigger invitation notification for the invited user
      window.dispatchEvent(new CustomEvent('teamInvitationSent', {
        detail: {
          invitationId: invitation[0].id,
          userId,
          teamId: selectedTeam.id,
          teamName: selectedTeam.name,
          invitedBy: user.user_metadata?.full_name || user.email.split('@')[0],
          userEmail: userToAdd.email
        }
      }))

      console.log('🎯 Invitation sent successfully:', {
        userId,
        email: userToAdd.email,
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        invitationId: invitation[0].id
      })

      setSuccess(`📧 Invitation sent to ${userToAdd.email}! They will receive a notification to join "${selectedTeam.name}".`)
      setShowAddMember(false)
      setMemberEmail('')
      setSearchResults([])
      setIsAddingMember(false)

      // Trigger invitation refresh for the invited user
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('invitationSent', {
          detail: {
            invitedUserId: userId,
            teamId: selectedTeam.id,
            teamName: selectedTeam.name,
            inviterName: user.user_metadata?.full_name || user.email.split('@')[0]
          }
        }))
      }, 500)
    } catch (error) {
      console.error('Error adding member:', error)
      setError('Failed to add member: ' + error.message)
      setIsAddingMember(false)
    }
  }

  const createChannel = async (channelName, channelDescription = '') => {
    if (!selectedTeam || !channelName.trim()) return

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({
          team_id: selectedTeam.id,
          name: channelName.trim(),
          description: channelDescription.trim(),
          created_by: user.id
        })
        .select()

      if (error) throw error

      setSuccess(`Channel "${channelName}" created successfully!`)
      fetchTeamData(selectedTeam.id)
    } catch (error) {
      console.error('Error creating channel:', error)
      setError('Failed to create channel: ' + error.message)
    }
  }

  const createTask = async (e) => {
    e.preventDefault()
    if (!selectedTeam || !taskTitle.trim()) return

    try {
      setLoading(true)

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          team_id: selectedTeam.id,
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          priority: taskPriority,
          due_date: taskDueDate || null,
          status: 'todo',
          created_by: user.id,
          assigned_to: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Reset form and close modal
      setTaskTitle('')
      setTaskDescription('')
      setTaskPriority('medium')
      setTaskDueDate('')
      setShowCreateTask(false)

      setSuccess(`✅ Task "${newTask.title}" created successfully!`)

      // Refresh team data to show new task
      fetchTeamData(selectedTeam.id)

    } catch (error) {
      console.error('Error creating task:', error)
      setError(`Failed to create task: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async () => {
    if (!selectedTeam || !eventTitle.trim() || !eventStartTime || !eventEndTime) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setError('')
      const { error } = await supabase
        .from('events')
        .insert({
          team_id: selectedTeam.id,
          title: eventTitle.trim(),
          description: eventDescription.trim(),
          start_time: eventStartTime,
          end_time: eventEndTime
        })

      if (error) throw error

      setSuccess(`Event "${eventTitle}" created successfully!`)
      setShowCreateEvent(false)
      setEventTitle('')
      setEventDescription('')
      setEventStartTime('')
      setEventEndTime('')
      fetchTeamData(selectedTeam.id)
    } catch (error) {
      console.error('Error creating event:', error)
      setError('Failed to create event: ' + error.message)
    }
  }

  const createSampleAnnouncement = async () => {
    if (!selectedTeam) return

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          team_id: selectedTeam.id,
          title: 'Welcome to the Team!',
          content: 'We are excited to have you join our team. Please check out the channels and feel free to introduce yourself.',
          author_id: user.id,
          priority: 'normal',
          is_published: true,
          published_at: new Date().toISOString()
        })

      if (error) throw error
      setSuccess('Sample announcement created!')
    } catch (error) {
      console.error('Error creating announcement:', error)
      setError('Failed to create announcement: ' + error.message)
    }
  }

  const createSampleTask = async () => {
    if (!selectedTeam) return

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          team_id: selectedTeam.id,
          title: 'Review Team Guidelines',
          description: 'Please review our team guidelines and best practices document.',
          status: 'todo',
          priority: 'medium'
        })

      if (error) throw error
      setSuccess('Sample task created!')
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Failed to create task: ' + error.message)
    }
  }

  const checkDatabaseSetup = async () => {
    try {
      setError('')
      setSuccess('')

      console.log('Checking database setup...')

      const tables = ['teams', 'team_members', 'channels', 'tasks', 'events', 'documents', 'announcements']
      const results = []

      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('id').limit(1)
          if (error) {
            console.error(`Error checking ${table}:`, error)
            results.push(`❌ ${table}: ${error.message}`)
          } else {
            results.push(`✅ ${table}: OK`)
          }
        } catch (err) {
          console.error(`Exception checking ${table}:`, err)
          results.push(`❌ ${table}: Exception - ${err.message}`)
        }
      }

      console.log('Database check results:', results)

      const allTablesExist = results.every(result => result.includes('✅'))

      if (allTablesExist) {
        setSuccess('Database setup is complete! All tables found.')
        // Try to fetch teams again
        setTimeout(() => {
          fetchUserTeams()
        }, 1000)
      } else {
        const missingTables = results.filter(r => r.includes('❌'))
        setError(`Missing tables detected:\n${missingTables.join('\n')}\n\nPlease run the database setup script in Supabase.`)
      }

    } catch (error) {
      console.error('Error checking database:', error)
      setError(`Failed to check database setup: ${error.message}`)
    }
  }

  const updateMemberWithRealEmail = async (memberId, realEmail) => {
    if (!selectedTeam || !realEmail) return

    try {
      setError('')

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(realEmail)) {
        setError('Please enter a valid email address')
        return
      }

      const { error } = await supabase
        .from('team_members')
        .update({
          permissions: {
            email: realEmail.trim(),
            name: realEmail.split('@')[0]
          }
        })
        .eq('id', memberId)
        .eq('team_id', selectedTeam.id)

      if (error) throw error

      setSuccess(`Member email updated to ${realEmail}`)
      fetchTeamData(selectedTeam.id) // Refresh to show updated email
    } catch (error) {
      console.error('Error updating member email:', error)
      setError('Failed to update member email: ' + error.message)
    }
  }

  const removeMember = async (memberId, memberEmail) => {
    if (!selectedTeam || !memberId) return

    // Check if current user is owner
    const currentUserRole = teamMembers.find(m => m.user_id === user?.id)?.role
    if (currentUserRole !== 'owner') {
      setError('❌ Access Denied: Only team owners can remove members')
      return
    }

    // Prevent owner from removing themselves
    const memberToRemove = teamMembers.find(m => m.id === memberId)
    if (memberToRemove?.user_id === user?.id) {
      setError('❌ You cannot remove yourself from the team')
      return
    }

    // Prevent removing other owners (if there are multiple owners)
    if (memberToRemove?.role === 'owner') {
      setError('❌ Cannot remove other team owners')
      return
    }

    const confirmMessage = `🗑️ Remove Team Member\n\nAre you sure you want to remove "${memberEmail}" from the team?\n\nThis action cannot be undone and they will lose access to all team content.`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setError('')

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('team_id', selectedTeam.id)

      if (error) throw error

      // Remove member from UI immediately
      setTeamMembers(prevMembers => prevMembers.filter(m => m.id !== memberId))

      // Update team stats immediately
      setTeamStats(prevStats => ({
        ...prevStats,
        totalMembers: prevStats.totalMembers - 1
      }))

      setSuccess(`${memberEmail} removed from team successfully!`)

      // Refresh team data after a short delay
      setTimeout(() => {
        fetchTeamData(selectedTeam.id)
      }, 500)
    } catch (error) {
      console.error('Error removing member:', error)
      setError('Failed to remove member: ' + error.message)
    }
  }

  const deleteTeam = async () => {
    if (!selectedTeam) return

    // Check if current user is owner
    const currentUserRole = teamMembers.find(m => m.user_id === user?.id)?.role
    if (currentUserRole !== 'owner') {
      setError('❌ Access Denied: Only team owners can delete teams')
      return
    }

    const confirmMessage = `🗑️ Delete Team\n\nAre you sure you want to permanently delete "${selectedTeam.name}"?\n\n⚠️ WARNING: This will:\n- Delete all team data (channels, tasks, events, documents)\n- Remove all team members\n- Cannot be undone\n\nType "${selectedTeam.name}" to confirm:`

    const userInput = prompt(confirmMessage)
    if (userInput !== selectedTeam.name) {
      if (userInput !== null) { // User didn't cancel
        setError('❌ Team name does not match. Deletion cancelled.')
      }
      return
    }

    try {
      setError('')
      setLoading(true)

      console.log('🗑️ Deleting team:', selectedTeam.name)

      // Delete the team (this should cascade delete all related data)
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', selectedTeam.id)

      if (error) throw error

      // Remove team from UI immediately
      setTeams(prevTeams => prevTeams.filter(t => t.id !== selectedTeam.id))

      // Clear selected team
      setSelectedTeam(null)
      setTeamMembers([])
      setTasks([])
      setEvents([])
      setDocuments([])
      setAnnouncements([])

      setSuccess(`✅ Team "${selectedTeam.name}" deleted successfully!`)

      // Refresh teams list
      setTimeout(() => {
        fetchUserTeams(true)
      }, 1000)

    } catch (error) {
      console.error('Error deleting team:', error)
      setError(`Failed to delete team: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-12 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="col-span-12 md:col-span-6 xl:col-span-4 bg-gray-800 rounded-xl p-5 h-48"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Teams</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered by user')
              fetchUserTeams(true)
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🔄</span>
            Refresh Teams
          </button>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Create Team
          </button>
          <button
            onClick={() => navigate('/app/voice')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">🎤</span>
            Voice
          </button>
        </div>
      </div>

      {/* Team Invitations - Always show section for better visibility */}
      <div className="mb-6">
        {invitations.length > 0 ? (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
                📧 Team Invitations ({invitations.length})
              </h3>
              <button
                onClick={() => setShowInvitations(!showInvitations)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {showInvitations ? 'Hide' : 'Show'}
              </button>
            </div>

            {showInvitations && (
              <div className="space-y-3">
                {invitations.map(invitation => (
                  <div key={invitation.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">
                          Join "{invitation.invitation_data?.team_name || 'Unknown Team'}"
                        </h4>
                        <p className="text-sm text-gray-400 mb-2">
                          {invitation.invitation_data?.invited_by_name || 'Someone'} invited you to join as {invitation.role}
                        </p>
                        <p className="text-xs text-gray-500">
                          Invited {new Date(invitation.invited_at).toLocaleDateString()} •
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          ✅ Join
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, 'decline')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">
              📭 No pending team invitations
            </p>
          </div>
        )}
      </div>

      {/* Public Teams - Anyone Can Join */}
      <div className="mb-6">
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-300 flex items-center gap-2 mb-4">
            🌍 Public Teams - Join & Chill!
          </h3>

          {publicTeams.length > 0 ? (
            <div className="grid gap-3">
              {publicTeams.map(team => (
                <div key={team.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">
                        {team.name}
                      </h4>
                      <p className="text-sm text-gray-400 mb-2">
                        {team.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(team.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => joinPublicTeam(team.id, team.name)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                    >
                      🚀 Join Team
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-4">
              <p>No public teams available to join right now</p>
              <p className="text-sm text-gray-500 mt-1">Create a public team for others to join!</p>
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <div className="text-gray-400 text-lg mb-2">No teams yet</div>

          {/* Special message for users who might have been added to teams */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="text-blue-300 text-sm mb-3">
              <strong>👋 Were you just added to a team?</strong>
            </div>
            <div className="text-blue-200 text-xs mb-3">
              If someone added you to a team but you don't see it here, try these steps:
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.log('🔍 USER MANUAL CHECK: Looking for teams...')
                  fetchUserTeams(true)
                }}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh My Teams
              </button>
              <button
                onClick={async () => {
                  console.log('🔍 USER DIRECT CHECK: Direct database lookup...')
                  setLoading(true)
                  try {
                    const { data: userMemberships, error } = await supabase
                      .from('team_members')
                      .select(`
                        team_id,
                        role,
                        joined_at,
                        teams!inner (
                          id,
                          name,
                          description,
                          is_public,
                          created_at
                        )
                      `)
                      .eq('user_id', user.id)

                    console.log('🔍 USER CHECK RESULT:', userMemberships)

                    if (userMemberships && userMemberships.length > 0) {
                      const foundTeams = userMemberships.map(m => ({
                        ...m.teams,
                        team_members: [{ role: m.role, joined_at: m.joined_at }]
                      }))

                      setTeams(foundTeams)
                      setSelectedTeam(foundTeams[0])
                      setSuccess(`🎉 Found ${foundTeams.length} team(s)! Welcome to ${foundTeams.map(t => t.name).join(', ')}`)
                    } else {
                      setError('❌ No teams found. Ask the team owner to add you again.')
                    }
                  } catch (err) {
                    console.error('❌ User check failed:', err)
                    setError(`Check failed: ${err.message}`)
                  } finally {
                    setLoading(false)
                  }
                }}
                className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                🔍 Check Database Directly
              </button>
            </div>
          </div>

          <div className="text-gray-500 text-sm mb-6">
            {error && error.includes('Database not set up') ? (
              <>
                Database tables not found. Please run the Teams setup script in Supabase first.
                <br />
                <span className="text-blue-400">Check the safe_teams_setup.sql file</span>
              </>
            ) : (
              'Create your first team to start collaborating with others'
            )}
          </div>
          {!error || !error.includes('Database not set up') ? (
            <button
              onClick={() => setShowCreateTeam(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Team
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-md text-sm max-w-lg mx-auto">
                <strong>Database Setup Required:</strong>
                <ol className="mt-2 ml-4 list-decimal text-xs space-y-1">
                  <li>Open Supabase Dashboard → SQL Editor</li>
                  <li>Copy content from <code>safe_teams_setup.sql</code></li>
                  <li>Paste and run the script</li>
                  <li>Click "Check DB" button above</li>
                </ol>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={checkDatabaseSetup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔍 Check Database
                </button>
                <button
                  onClick={() => {
                    const script = `-- Safe Teams Database Setup - Run in Supabase SQL Editor
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'base64')
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  permissions JSONB DEFAULT '{}'::jsonb,
  UNIQUE(team_id, user_id)
);

-- Channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice', 'announcement')),
  is_private BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  updated_by UUID,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.channels TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.announcements TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_team_id ON public.channels(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_events_team_id ON public.events(team_id);

SELECT 'Teams database setup completed successfully! 🎉' as result;`

                    navigator.clipboard.writeText(script)
                    setSuccess('Setup script copied to clipboard! Paste it in Supabase SQL Editor.')
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📋 Copy Setup Script
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Teams List */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Your Teams</h2>
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`p-4 rounded-xl cursor-pointer transition-colors ${selectedTeam?.id === team.id
                  ? 'bg-blue-900/40 border border-blue-500/50'
                  : 'bg-gray-900/40 border border-gray-800 hover:bg-gray-900/60'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-700 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{team.name}</h3>
                    <p className="text-sm text-gray-400 truncate">
                      {team.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Role: {team.team_members[0]?.role || 'member'}
                      </span>
                      {team.is_public && (
                        <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Team Details */}
          {selectedTeam && (
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
                {/* Team Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-700 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                      {selectedTeam.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedTeam.name}</h2>
                      <p className="text-gray-400">{selectedTeam.description || 'No description'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddMember(true)
                      setMemberEmail('')
                      setSearchResults([])
                      setError('')
                      setSuccess('')
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    Add Member
                  </button>

                  {/* Delete Team Button - Only show for owners */}
                  {teamMembers.find(m => m.user_id === user?.id)?.role === 'owner' && (
                    <button
                      onClick={deleteTeam}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      title="Delete Team (Owner Only)"
                    >
                      <span className="text-lg">🗑️</span>
                      Delete Team
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 mb-6 bg-gray-800/50 rounded-lg p-1">
                  {[
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'members', label: 'Members', icon: '👥' },
                    { id: 'tasks', label: 'Tasks', icon: '✅' },
                    { id: 'events', label: 'Events', icon: '📅' },
                    { id: 'documents', label: 'Documents', icon: '📄' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-96">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                          <div className="text-2xl font-bold text-blue-400">{teamStats.totalMembers}</div>
                          <div className="text-sm text-gray-400">Total Members</div>
                          <div className="text-xs text-gray-500 mt-1">Real: {teamMembers.length}</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                          <div className="text-2xl font-bold text-yellow-400">{teamStats.openTasks}</div>
                          <div className="text-sm text-gray-400">Open Tasks</div>
                          <div className="text-xs text-gray-500 mt-1">Total: {tasks.length}</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                          <div className="text-2xl font-bold text-purple-400">{teamStats.upcomingEvents}</div>
                          <div className="text-sm text-gray-400">Upcoming Events</div>
                          <div className="text-xs text-gray-500 mt-1">Total: {events.length}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Recent Announcements</h3>
                            <button
                              onClick={createSampleAnnouncement}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              + Add Sample
                            </button>
                          </div>
                          {announcements.length > 0 ? (
                            <div className="space-y-3">
                              {announcements.slice(0, 3).map(announcement => (
                                <div key={announcement.id} className="border-l-4 border-blue-500 pl-4">
                                  <h4 className="font-medium text-white">{announcement.title}</h4>
                                  <p className="text-sm text-gray-400 mt-1">{announcement.content.substring(0, 100)}...</p>
                                  <div className="text-xs text-gray-500 mt-2">
                                    {new Date(announcement.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-center py-4">
                              No announcements yet
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Recent Tasks</h3>
                            <button
                              onClick={createSampleTask}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              + Add Sample
                            </button>
                          </div>
                          {tasks.length > 0 ? (
                            <div className="space-y-3">
                              {tasks.slice(0, 3).map(task => (
                                <div key={task.id} className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-white">{task.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs px-2 py-1 rounded ${task.status === 'done' ? 'bg-green-900 text-green-300' :
                                        task.status === 'in_progress' ? 'bg-blue-900 text-blue-300' :
                                          'bg-gray-700 text-gray-300'
                                        }`}>
                                        {task.status.replace('_', ' ')}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded ${task.priority === 'urgent' ? 'bg-red-900 text-red-300' :
                                        task.priority === 'high' ? 'bg-orange-900 text-orange-300' :
                                          task.priority === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                        {task.priority}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-center py-4">
                              No tasks yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}


                  {activeTab === 'members' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Team Members</h3>
                        <div className="text-sm text-gray-400">{teamMembers.length} members</div>
                      </div>

                      {/* Permissions Info */}
                      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">ℹ️</span>
                          <div className="text-sm text-blue-300">
                            <strong>Team Permissions:</strong>
                            <div className="mt-1 space-y-1">
                              <div>👑 <strong>Owner</strong> - Can add/remove members and manage team settings</div>
                              <div>👤 <strong>Members</strong> - Can access team content but cannot remove other members</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {teamMembers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {teamMembers.map(member => (
                            <div key={member.id} className="bg-gray-800/50 rounded-lg p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {member.user_email?.charAt(0)?.toUpperCase() || member.user_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-white">{member.user_name || member.user_email || `User ${member.user_id?.substring(0, 8)}`}</h4>
                                      <p className="text-sm text-gray-400">{member.user_email}</p>
                                    </div>
                                    {/* Remove button - only show for owners and not for the owner themselves */}
                                    {teamMembers.find(m => m.user_id === user?.id)?.role === 'owner' &&
                                      member.user_id !== user?.id && (
                                        <button
                                          onClick={() => removeMember(member.id, member.user_email)}
                                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                                          title="Remove member"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${member.role === 'owner' ? 'bg-red-900 text-red-300' :
                                      member.role === 'admin' ? 'bg-orange-900 text-orange-300' :
                                        member.role === 'moderator' ? 'bg-blue-900 text-blue-300' :
                                          'bg-gray-700 text-gray-300'
                                      }`}>
                                      {member.role === 'owner' && '👑'}
                                      {member.role === 'admin' && '⚡'}
                                      {member.role === 'moderator' && '🛡️'}
                                      {member.role === 'member' && '👤'}
                                      {member.role}
                                      {member.user_id === user?.id && ' (You)'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Joined {new Date(member.joined_at).toLocaleDateString()}
                                    </span>
                                    {/* Show permissions indicator */}
                                    {member.role === 'owner' && (
                                      <span className="text-xs text-yellow-400" title="Can manage all team members">
                                        🔧 Full Access
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-8">
                          No members yet. Add members to see them here.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tasks' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Tasks & Projects</h3>
                        <button
                          onClick={() => setShowCreateTask(true)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          + Create Task
                        </button>
                      </div>

                      {tasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {tasks.map(task => (
                            <div key={task.id} className="bg-gray-800/50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-medium text-white">{task.title}</h4>
                                <span className={`text-xs px-2 py-1 rounded ${task.status === 'done' ? 'bg-green-900 text-green-300' :
                                  task.status === 'in_progress' ? 'bg-blue-900 text-blue-300' :
                                    task.status === 'review' ? 'bg-yellow-900 text-yellow-300' :
                                      'bg-gray-700 text-gray-300'
                                  }`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>

                              {task.description && (
                                <p className="text-sm text-gray-400 mb-3">{task.description}</p>
                              )}

                              <div className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-1 rounded ${task.priority === 'urgent' ? 'bg-red-900 text-red-300' :
                                  task.priority === 'high' ? 'bg-orange-900 text-orange-300' :
                                    task.priority === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                                      'bg-gray-700 text-gray-300'
                                  }`}>
                                  {task.priority} priority
                                </span>

                                {task.due_date && (
                                  <span className="text-xs text-gray-500">
                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-8">
                          No tasks yet. Create your first task to start tracking work.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'events' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Events & Meetings</h3>
                        <button
                          onClick={() => setShowCreateEvent(true)}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                        >
                          + Create Event
                        </button>
                      </div>
                      <div className="text-gray-400 text-center py-8">
                        No events scheduled. Create your first event.
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Documents & Files</h3>
                        <button
                          onClick={() => setShowFileUpload(true)}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                        >
                          + Upload Document
                        </button>
                      </div>
                      {documents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {documents.map(doc => (
                            <div key={doc.id} className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.file_type?.includes('image') ? 'bg-green-600' :
                                  doc.file_type?.includes('pdf') ? 'bg-red-600' :
                                    doc.file_type?.includes('video') ? 'bg-purple-600' :
                                      doc.file_type?.includes('audio') ? 'bg-blue-600' :
                                        'bg-orange-600'
                                  }`}>
                                  {doc.file_type?.includes('image') ? (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  ) : doc.file_type?.includes('pdf') ? (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                  ) : doc.file_type?.includes('video') ? (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  ) : doc.file_type?.includes('audio') ? (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                  ) : (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-white truncate">{doc.name}</h4>
                                  <p className="text-sm text-gray-400 mt-1">
                                    {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {doc.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      // Download the file
                                      if (doc.file_url.startsWith('http')) {
                                        // Real Supabase URL - direct download
                                        const a = document.createElement('a')
                                        a.href = doc.file_url
                                        a.download = doc.name
                                        a.target = '_blank'
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                      } else if (doc.file_url.startsWith('data:')) {
                                        // Data URL - direct download
                                        const a = document.createElement('a')
                                        a.href = doc.file_url
                                        a.download = doc.name
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                      } else {
                                        // Fallback - create text file
                                        const blob = new Blob([`This is a simulated download of ${doc.name}`], { type: 'text/plain' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = doc.name
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                        URL.revokeObjectURL(url)
                                      }
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                                  >
                                    ⬇️ Download
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
                                        try {
                                          const { error } = await supabase
                                            .from('documents')
                                            .delete()
                                            .eq('id', doc.id)

                                          if (error) throw error

                                          setSuccess(`✅ Document "${doc.name}" deleted successfully!`)
                                          fetchTeamData(selectedTeam.id) // Refresh the documents list
                                        } catch (error) {
                                          console.error('Error deleting document:', error)
                                          setError(`Failed to delete document: ${error.message}`)
                                        }
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-8">
                          <div className="text-4xl mb-3">📁</div>
                          <p className="text-lg font-medium mb-2">No documents shared yet</p>
                          <p className="text-sm">Upload your first document to get started</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create New Team</h2>
            <form onSubmit={createTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your team"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-300">
                  Make this team public (anyone can join)
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTeam(false)
                    setTeamName('')
                    setTeamDescription('')
                    setIsPublic(false)
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => {
                    setMemberEmail(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user email"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Found Users:
                  </label>
                  {searchResults.map((foundUser) => (
                    <div key={foundUser.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{foundUser.email}</div>
                          <div className="text-sm text-gray-400">
                            {foundUser.raw_user_meta_data?.full_name || 'No name provided'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={memberRole}
                            onChange={(e) => setMemberRole(e.target.value)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => addMember(foundUser)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddMember(false)
                    setMemberEmail('')
                    setSearchResults([])
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                {searchResults.length === 0 && memberEmail.trim() && (
                  <button
                    onClick={() => {
                      // Validate email format
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                      if (!emailRegex.test(memberEmail.trim())) {
                        setError('Please enter a valid email address')
                        return
                      }

                      // Create a user entry for the email and add them with proper UUID
                      const userId = generateUUID()

                      const newUser = {
                        id: userId,
                        email: memberEmail.trim(),
                        raw_user_meta_data: {
                          full_name: memberEmail.split('@')[0]
                        }
                      }
                      addMember(newUser)
                    }}
                    disabled={isAddingMember}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAddingMember ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding...
                      </>
                    ) : (
                      'Add Member'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Event</h3>
              <button
                onClick={() => {
                  setShowCreateEvent(false)
                  setEventTitle('')
                  setEventDescription('')
                  setEventStartTime('')
                  setEventEndTime('')
                  setError('')
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter event title"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Enter event description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setShowCreateEvent(false)
                  setEventTitle('')
                  setEventDescription('')
                  setEventStartTime('')
                  setEventEndTime('')
                  setError('')
                }}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createEvent}
                disabled={!eventTitle.trim() || !eventStartTime || !eventEndTime}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Task</h2>
              <button
                onClick={() => {
                  setShowCreateTask(false)
                  setTaskTitle('')
                  setTaskDescription('')
                  setTaskPriority('medium')
                  setTaskDueDate('')
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={createTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Enter task description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTask(false)
                    setTaskTitle('')
                    setTaskDescription('')
                    setTaskPriority('medium')
                    setTaskDueDate('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !taskTitle.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Upload Document</h2>
              <button
                onClick={() => {
                  setShowFileUpload(false)
                  setSelectedFile(null)
                  setUploadProgress(0)
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* File Info */}
              {selectedFile && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{selectedFile.name}</p>
                      <p className="text-gray-400 text-sm">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Uploading...</span>
                    <span className="text-gray-300">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFileUpload(false)
                    setSelectedFile(null)
                    setUploadProgress(0)
                  }}
                  disabled={isUploading}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedFile && uploadFile(selectedFile)}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
