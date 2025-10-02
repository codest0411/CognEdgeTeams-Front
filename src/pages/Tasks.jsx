import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const COLUMN_ORDER = [
	{ 
		key: 'todo', 
		title: 'To Do', 
		color: 'bg-blue-600',
		bgColor: 'bg-blue-900/20',
		borderColor: 'border-blue-600/30'
	},
	{ 
		key: 'inprogress', 
		title: 'In Progress', 
		color: 'bg-yellow-600',
		bgColor: 'bg-yellow-900/20',
		borderColor: 'border-yellow-600/30'
	},
	{ 
		key: 'done', 
		title: 'Done', 
		color: 'bg-green-600',
		bgColor: 'bg-green-900/20',
		borderColor: 'border-green-600/30'
	},
];

const PRIORITY_COLORS = {
	low: 'bg-gray-500',
	medium: 'bg-blue-500',
	high: 'bg-orange-500',
	urgent: 'bg-red-500'
};

export default function Tasks() {
	const { user } = useAuth();
	const [tasks, setTasks] = useState([]);
	const [adding, setAdding] = useState({});
	const [newTask, setNewTask] = useState({});
	const [editingTask, setEditingTask] = useState(null);
	const [showTaskModal, setShowTaskModal] = useState(false);
	const [selectedTask, setSelectedTask] = useState(null);
	const [filter, setFilter] = useState('all');
	const [sortBy, setSortBy] = useState('created_at');
	const dragCounter = useRef(0);

	// Fetch tasks from Supabase (only for current user)
	const fetchTasks = async () => {
		if (!user) {
			console.log('No user, cannot fetch tasks');
			return;
		}
		console.log('Fetching tasks for user:', user.id);
		
		// Try without RLS filtering first
		const { data, error } = await supabase
			.from('tasks')
			.select('*')
			.order('created_at', { ascending: false });
			
		if (error) {
			console.error('Error fetching tasks:', error);
			alert('Error fetching tasks: ' + error.message);
		} else {
			console.log('Fetched tasks (all):', data);
			console.log('Total tasks in DB:', data?.length || 0);
			// Filter by user on client side for now
			const userTasks = data?.filter(t => t.user_id === user.id || t.created_by === user.id) || [];
			console.log('User tasks:', userTasks);
			setTasks(userTasks);
		}
	};

	useEffect(() => {
		console.log('Tasks component mounted, user:', user);
		if (user) {
			fetchTasks();
			// Subscribe to realtime changes
			const channel = supabase
				.channel('tasks-changes')
				.on(
					'postgres_changes',
					{ event: '*', schema: 'public', table: 'tasks' },
					(payload) => {
						console.log('Real-time update:', payload);
						fetchTasks();
					}
				)
				.subscribe((status) => {
					console.log('Subscription status:', status);
				});
			return () => {
				supabase.removeChannel(channel);
			};
		}
	}, [user]);

	// Add new task with advanced properties
	const handleAddTask = async (colKey) => {
		if (!newTask[colKey] || !user) return;
		
		const taskData = {
			title: newTask[colKey],
			status: colKey,
			user_id: user.id,
			created_by: user.id,
			team_id: null, // Personal tasks have no team_id
			priority: 'medium'
		};

		console.log('Creating task:', taskData);
		const { data, error } = await supabase.from('tasks').insert([taskData]).select();
		
		if (error) {
			console.error('Error creating task:', error);
			alert('Error creating task: ' + error.message);
		} else {
			console.log('Task created successfully:', data);
			setNewTask((prev) => ({ ...prev, [colKey]: '' }));
			setAdding((prev) => ({ ...prev, [colKey]: false }));
			await fetchTasks();
		}
	};

	// Handle drag and drop with native HTML5 API
	const [draggedTask, setDraggedTask] = useState(null);
	const [dragOverColumn, setDragOverColumn] = useState(null);

	const handleDragStart = (e, task) => {
		setDraggedTask(task);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/html', e.target.outerHTML);
		e.target.style.opacity = '0.5';
	};

	const handleDragEnd = (e) => {
		e.target.style.opacity = '1';
		setDraggedTask(null);
		setDragOverColumn(null);
	};

	const handleDragOver = (e, columnKey) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverColumn(columnKey);
	};

	const handleDragLeave = (e) => {
		setDragOverColumn(null);
	};

	const handleDrop = async (e, targetColumn) => {
		e.preventDefault();
		setDragOverColumn(null);

		if (!draggedTask || draggedTask.status === targetColumn) {
			return;
		}

		// Update task status
		await supabase
			.from('tasks')
			.update({ 
				status: targetColumn,
				updated_at: new Date().toISOString()
			})
			.eq('id', draggedTask.id);

		await fetchTasks();
	};

	// Add to activity feed
	const addToActivity = async (action, description) => {
		if (!user) return;
		
		await supabase.from('activities').insert([{
			user_id: user.id,
			action,
			description,
			created_at: new Date().toISOString()
		}]);
	};

	// Update task
	const updateTask = async (taskId, updates) => {
		await supabase
			.from('tasks')
			.update({ ...updates, updated_at: new Date().toISOString() })
			.eq('id', taskId);
		await fetchTasks();
	};

	// Delete task
	const deleteTask = async (taskId) => {
		await supabase.from('tasks').delete().eq('id', taskId);
		await fetchTasks();
	};

	// Set reminder
	const setReminder = async (taskId, reminderTime) => {
		await updateTask(taskId, { reminder_time: reminderTime });
	};

	// Filter tasks
	const filteredTasks = tasks.filter(task => {
		if (filter === 'all') return true;
		if (filter === 'high_priority') return task.priority === 'high' || task.priority === 'urgent';
		if (filter === 'with_reminders') return task.reminder_time;
		if (filter === 'overdue') {
			const dueDate = new Date(task.due_date);
			return task.due_date && dueDate < new Date() && task.status !== 'done';
		}
		return true;
	});

	const getTasksByStatus = (status) => {
		return filteredTasks.filter(t => t.status === status);
	};

	const formatDate = (dateString) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	const isOverdue = (task) => {
		if (!task.due_date || task.status === 'done') return false;
		return new Date(task.due_date) < new Date();
	};

	return (
		<div className="p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-white mb-2">Task Management</h1>
					<p className="text-gray-400">Organize and track your tasks efficiently</p>
				</div>
				<div className="flex items-center gap-3">
					{/* Filter Dropdown */}
					<select
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="all">All Tasks</option>
						<option value="high_priority">High Priority</option>
						<option value="with_reminders">With Reminders</option>
						<option value="overdue">Overdue</option>
					</select>
					
					{/* Sort Dropdown */}
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="created_at">Date Created</option>
						<option value="updated_at">Last Updated</option>
						<option value="due_date">Due Date</option>
						<option value="priority">Priority</option>
					</select>
				</div>
			</div>

			{/* Task Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				{COLUMN_ORDER.map((col) => {
					const columnTasks = getTasksByStatus(col.key);
					return (
						<div key={col.key} className={`${col.bgColor} ${col.borderColor} border rounded-lg p-4`}>
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-white font-medium">{col.title}</h3>
									<p className="text-2xl font-bold text-white mt-1">{columnTasks.length}</p>
								</div>
								<div className={`w-10 h-10 ${col.color} rounded-lg flex items-center justify-center`}>
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Kanban Board */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{COLUMN_ORDER.map((col) => (
					<div key={col.key} className={`rounded-xl border ${col.borderColor} ${col.bgColor} p-4`}>
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className={`w-3 h-3 ${col.color} rounded-full`}></div>
								<h2 className="text-lg font-semibold text-white">{col.title}</h2>
								<span className="text-sm text-gray-400">({getTasksByStatus(col.key).length})</span>
							</div>
							<button
								className="rounded-lg px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white transition-colors"
								onClick={() => setAdding((prev) => ({ ...prev, [col.key]: true }))}
							>
								+ Add
							</button>
						</div>

						<div
							className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
								dragOverColumn === col.key ? 'bg-gray-800/30 border-2 border-dashed border-gray-600' : ''
							}`}
							onDragOver={(e) => handleDragOver(e, col.key)}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, col.key)}
						>
							{getTasksByStatus(col.key).map((task) => (
								<div
									key={task.id}
									draggable
									onDragStart={(e) => handleDragStart(e, task)}
									onDragEnd={handleDragEnd}
									className={`rounded-lg bg-gray-800 p-4 text-sm border border-gray-700 hover:border-gray-600 transition-all cursor-move ${
										isOverdue(task) ? 'border-red-500/50 bg-red-900/20' : ''
									} ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
									onClick={() => {
										setSelectedTask(task);
										setShowTaskModal(true);
									}}
								>
									<div className="flex items-start justify-between mb-2">
										<h3 className="font-semibold text-white flex-1 break-words">{task.title}</h3>
										<div className="flex items-center gap-1 ml-2">
											{task.priority && (
												<div className={`w-2 h-2 ${PRIORITY_COLORS[task.priority]} rounded-full`} title={`${task.priority} priority`}></div>
											)}
											{task.reminder_time && (
												<svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
												</svg>
											)}
											{/* Drag Handle */}
											<svg className="w-4 h-4 text-gray-500 cursor-move" fill="currentColor" viewBox="0 0 20 20">
												<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
											</svg>
										</div>
									</div>
									
									{task.description && (
										<p className="text-gray-300 text-sm mb-2 line-clamp-2 break-words">{task.description}</p>
									)}
									
									<div className="flex items-center justify-between text-xs text-gray-400">
										<span>{formatDate(task.created_at)}</span>
										{task.due_date && (
											<span className={isOverdue(task) ? 'text-red-400' : 'text-gray-400'}>
												Due: {formatDate(task.due_date)}
											</span>
										)}
									</div>
								</div>
							))}
							
							{/* Add Task Form */}
							{adding[col.key] && (
								<div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
									<input
										className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none mb-2"
										value={newTask[col.key] || ''}
										onChange={(e) =>
											setNewTask((prev) => ({
												...prev,
												[col.key]: e.target.value,
											}))
										}
										placeholder={`Add task to ${col.title}...`}
										autoFocus
										onKeyPress={(e) => e.key === 'Enter' && handleAddTask(col.key)}
									/>
									<div className="flex gap-2">
										<button
											className="flex-1 rounded-lg px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white transition-colors"
											onClick={() => handleAddTask(col.key)}
										>
											Add Task
										</button>
										<button
											className="rounded-lg px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white transition-colors"
											onClick={() => setAdding((prev) => ({ ...prev, [col.key]: false }))}
										>
											Cancel
										</button>
									</div>
								</div>
							)}

							{/* Drop Zone Indicator */}
							{dragOverColumn === col.key && draggedTask && draggedTask.status !== col.key && (
								<div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-500 rounded-lg bg-gray-800/20">
									<span className="text-gray-400 text-sm">Drop task here</span>
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Task Detail Modal */}
			{showTaskModal && selectedTask && (
				<TaskDetailModal
					task={selectedTask}
					onClose={() => {
						setShowTaskModal(false);
						setSelectedTask(null);
					}}
					onUpdate={updateTask}
					onDelete={deleteTask}
					onSetReminder={setReminder}
				/>
			)}
		</div>
	);
}

// Task Detail Modal Component
function TaskDetailModal({ task, onClose, onUpdate, onDelete, onSetReminder }) {
	const [editedTask, setEditedTask] = useState({
		title: task.title || '',
		description: task.description || '',
		priority: task.priority || 'medium',
		due_date: task.due_date || '',
		reminder_time: task.reminder_time || ''
	});

	const handleSave = () => {
		onUpdate(task.id, editedTask);
		onClose();
	};

	const handleDelete = () => {
		if (window.confirm('Are you sure you want to delete this task?')) {
			onDelete(task.id);
			onClose();
		}
	};

	const handleSetReminder = () => {
		if (editedTask.reminder_time) {
			onSetReminder(task.id, editedTask.reminder_time);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-gray-800 rounded-xl p-6 w-96 max-h-[90vh] overflow-y-auto border border-gray-700">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-white">Task Details</h3>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-white"
					>
						✕
					</button>
				</div>
				<div className="space-y-4">
					{/* Title */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
						<input
							type="text"
							value={editedTask.title}
							onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
							className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
						<textarea
							value={editedTask.description}
							onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
							className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
							rows={3}
						/>
					</div>

					{/* Priority */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
						<select
							value={editedTask.priority}
							onChange={(e) => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
							className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
							<option value="urgent">Urgent</option>
						</select>
					</div>

					{/* Due Date */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
						<input
							type="date"
							value={editedTask.due_date}
							onChange={(e) => setEditedTask(prev => ({ ...prev, due_date: e.target.value }))}
							className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
						/>
					</div>

					{/* Reminder */}
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Reminder</label>
						<div className="flex gap-2">
							<input
								type="datetime-local"
								value={editedTask.reminder_time}
								onChange={(e) => setEditedTask(prev => ({ ...prev, reminder_time: e.target.value }))}
								className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
							/>
							<button
								onClick={handleSetReminder}
								className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
							>
								Set
							</button>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 mt-6">
					<button
						onClick={handleSave}
						className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
					>
						Save Changes
					</button>
					<button
						onClick={handleDelete}
						className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}