/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  options: PollOption[];
  totalVotes: number;
  totalDonations: number;
  isActive: boolean;
  matchDate?: string;
  venue?: string;
  goal?: number;
}

interface Transaction {
  id: string;
  voterName: string;
  supportedTeam: string;
  donationAmount: number;
  voteWeight: number;
  pollTitle: string;
  timestamp: string;
}

interface Notification {
  id: number;
  message: string;
  type: string;
  timestamp: string;
}

const InteractiveLivePolling = () => {
  const [currentView, setCurrentView] = useState('home');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newPoll, setNewPoll] = useState({ title: '', options: ['', ''] });
  const [autoSimEnabled] = useState(false);

  // Initialize polls with sample data
  useEffect(() => {
    const samplePolls = [
      {
        id: '1',
        title: 'Rugby Match 2025',
        options: [
          { text: 'Vidyartha College', votes: 0 },
          { text: 'Sylvester College', votes: 0 },
        ],
        totalVotes: 0,
        totalDonations: 0,
        isActive: true,
        matchDate: 'September 13th, 2025',
        venue: 'Bogrambara Stadium, Kandy',
      },
    ];

    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('polls') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPolls(parsed);
          return;
        }
      }
    } catch (error) {
      console.log('Error loading stored polls:', error);
    }
    
    // If no stored polls or error, use sample
    setPolls(samplePolls);
    if (typeof window !== 'undefined') {
      localStorage.setItem('polls', JSON.stringify(samplePolls));
    }
  }, []);

  // Set activePoll when polls are loaded
  useEffect(() => {
    if (polls.length > 0 && !activePoll) {
      setActivePoll(polls[0]);
    }
  }, [polls, activePoll]);

  // Persist polls to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && polls.length > 0) {
        localStorage.setItem('polls', JSON.stringify(polls));
      }
    } catch (error) {
      console.error('Error saving polls to localStorage:', error);
    }
  }, [polls]);

  const addNotification = (message: string, type: string = 'info') => {
    const notification: Notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  const createPoll = () => {
    if (!newPoll.title.trim() || newPoll.options.some(opt => !opt.trim())) {
      addNotification('Please fill in all fields', 'error');
      return;
    }

    const poll: Poll = {
      id: Date.now().toString(),
      title: newPoll.title,
      options: newPoll.options.filter(opt => opt.trim()).map(text => ({ text, votes: 0 })),
      totalVotes: 0,
      totalDonations: 0,
      isActive: true,
    };

    setPolls(prev => [poll, ...prev]);
    setNewPoll({ title: '', options: ['', ''] });
    setIsCreatingPoll(false);
    addNotification('Poll created successfully!', 'success');
  };

  // Simple vote form component
  const SimpleVoteForm = () => {
    const [name, setName] = useState("");
    const [team, setTeam] = useState("");
    const [donation, setDonation] = useState("100");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        if (!name.trim()) {
          addNotification('Please enter your name', 'error');
          return;
        }

        if (!team) {
          addNotification('Please select a team', 'error');
          return;
        }

        const donationVal = Number(donation);
        if (donationVal < 100) {
          addNotification('Minimum donation is Rs. 100', 'error');
          return;
        }

        if (activePoll) {
          // Calculate vote weight - 1 vote per Rs. 100
          const voteWeight = Math.floor(donationVal / 100);
          
          // Find team index
          const teamIndex = activePoll.options.findIndex(opt => opt.text === team);
          
          if (teamIndex !== -1) {
            // Create updated poll data
            const updatedPoll = { ...activePoll };
            updatedPoll.options = [...updatedPoll.options];
            updatedPoll.options[teamIndex] = {
              ...updatedPoll.options[teamIndex],
              votes: updatedPoll.options[teamIndex].votes + voteWeight
            };
            updatedPoll.totalVotes += voteWeight;
            updatedPoll.totalDonations = (updatedPoll.totalDonations || 0) + donationVal;

            // Create transaction record
            const transaction: Transaction = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              voterName: name,
              supportedTeam: team,
              donationAmount: donationVal,
              voteWeight: voteWeight,
              pollTitle: updatedPoll.title,
              timestamp: new Date().toISOString()
            };

            // Update localStorage FIRST to ensure persistence
            try {
              // Update polls in localStorage
              const existingPolls = JSON.parse(localStorage.getItem('polls') || '[]');
              const updatedPolls = existingPolls.map((p: Poll) => 
                p.id === updatedPoll.id ? updatedPoll : p
              );
              localStorage.setItem('polls', JSON.stringify(updatedPolls));

              // Update transactions in localStorage
              const existingTxs = JSON.parse(localStorage.getItem('transactions') || '[]');
              const updatedTxs = [transaction, ...existingTxs];
              localStorage.setItem('transactions', JSON.stringify(updatedTxs));

              console.log('Data saved to localStorage:', { updatedPoll, transaction });
            } catch (err) {
              console.error('Error saving to localStorage:', err);
              addNotification('Error saving vote. Please try again.', 'error');
              return;
            }

            // Update React state AFTER localStorage is updated
            setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
            setActivePoll(updatedPoll);

            // Show success message
            addNotification(
              `Thank you! ${voteWeight} votes added for ${team}. Donation: Rs.${donationVal}`, 
              'success'
            );

            // Reset form
            setName('');
            setTeam('');
            setDonation('100');
          }
        }
      } catch (err) {
        console.error('Error submitting vote:', err);
        addNotification('Error submitting vote. Please try again.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="mt-8 mb-4 bg-blue-50 rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-blue-400 rounded px-3 py-2"
            placeholder="Enter your full name"
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Team
          </label>
          <select
            value={team}
            onChange={e => setTeam(e.target.value)}
            className="w-full border border-blue-300 rounded px-3 py-2"
            required
            disabled={isSubmitting}
          >
            <option value="">Select your team...</option>
            <option value="Vidyartha College">Vidyartha College</option>
            <option value="Sylvester College">Sylvester College</option>
          </select>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Support Your Team with a Donation (Min. Rs. 100)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-500 font-medium">Rs.</span>
            <input
              type="number"
              value={donation}
              onChange={e => setDonation(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg"
              min="100"
              step="100"
              required
              disabled={isSubmitting}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Every Rs. 100 = 1 vote</p>
        </div>
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-700 hover:bg-blue-800'
          } text-white rounded-lg font-semibold transition-colors`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Vote'}
        </button>
      </form>
    );
  };

  const simulateRandomVote = (poll: Poll) => {
    const randomOption = Math.floor(Math.random() * poll.options.length);
    const randomDonation = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 5 : 0;
    const voteWeight = randomDonation > 0 ? Math.floor(randomDonation / 10) + 1 : 1;

    const updatedPoll = { ...poll };
    updatedPoll.options[randomOption].votes += voteWeight;
    updatedPoll.totalVotes += voteWeight;
    updatedPoll.totalDonations += randomDonation;

    setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    
    const randomNames = ['Alex', 'Sarah', 'Mike', 'Lisa', 'John', 'Emma', 'David', 'Jessica'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    
    addNotification(
      randomDonation > 0 
        ? `${randomName} donated Rs. ${randomDonation} and voted!` 
        : `${randomName} voted!`,
      'success'
    );
  };

  // Auto-simulate votes every 3-8 seconds (disabled by default)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!autoSimEnabled) return;

    const interval = setInterval(() => {
      if (polls.length > 0) {
        const randomPoll = polls[Math.floor(Math.random() * polls.length)];
        simulateRandomVote(randomPoll);
      }
    }, Math.random() * 5000 + 3000);

    return () => clearInterval(interval);
  }, [polls, activePoll, autoSimEnabled, simulateRandomVote]);

  const HomeView = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h5 className="text-4xl font-bold text-gray-800 mb-2">
          Sylvester&apos;s vs Vidyartha 2025 Rugby Match 13th September
        </h5>

        {/* School Badges Section */}
        <div className="flex justify-center items-center gap-12 mb-4">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-2 bg-gradient-to-b from-red-600 via-white to-blue-800 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-300">
              <Image src="/ssckk.png" alt="ssck" width={70} height={70} style={{ borderRadius: "45px" }}/>
            </div>
            <div className="font-bold text-red-800">Sylvester&apos;s College</div>
          </div>
          
          <div className="text-4xl font-bold text-gray-400">VS</div>

          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-2 bg-gradient-to-b from-yellow-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Image src="/vidyartha.jpg" alt="vidyartha" width={70} height={70} style={{ borderRadius: "35px" }}/>
            </div>
            <div className="font-bold text-blue-800">Vidyartha College</div>
          </div>
        </div>
        
        <div className="text-lg text-gray-600 mb-2">
          September 13th, 2025 
        </div>
        <p className="text-xl text-gray-600 mb-8">
          Vote for your predictions and support your school with donations!
        </p>

        <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          LIVE: Big Match 2025 Polling Active
        </div>
      </div>

      {/* Special Big Match Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-red-600 text-white rounded-lg p-8 text-center">
        <div className="grid md:grid-cols-2 gap-8 mb-6">
          <div className="bg-black bg-opacity-20 rounded-lg p-6 border border-blue-300">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Image src="/vidyartha.jpg" alt="vidyartha" width={70} height={70} style={{ borderRadius: "35px" }}/>
              <h3 className="text-xl font-bold">Vidyartha College</h3>
            </div>
            <div className="text-2xl font-bold">{polls[0]?.options?.[0]?.votes || 0} Votes</div>
          </div>
          <div className="bg-black bg-opacity-20 rounded-lg p-6 border border-red-300">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Image src="/ssckk.png" alt="ssck" width={70} height={70} style={{ borderRadius: "45px" }}/>
              <h3 className="text-xl font-bold">Sylvester's College</h3>
            </div>
            <div className="text-2xl font-bold">{polls[0]?.options?.[1]?.votes || 0} Votes</div>
          </div>
        </div>
        <p className="text-lg opacity-90">
          Support your school by voting and donating! Every Rs. 100 donated = 1 vote
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1">
        {polls.map((poll) => {
          const leadingOption = poll.options.reduce((max, option) => 
            option.votes > max.votes ? option : max, poll.options[0]);
          
          return (
            <div key={poll.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              {poll.matchDate && (
                <div className="mb-3 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                  {poll.matchDate}
                  {poll.venue && <div>{poll.venue}</div>}
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{poll.totalVotes} total votes</span>
                </div>
              </div>

          

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActivePoll(poll);
                    setCurrentView('poll');
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm"
                >
                  Vote Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-2xl font-semibold text-blue-600 mb-4">
        Brace yourself for an adrenalin-charged showdown! Witness the power, passion, and brotherhood as rivals collide on the rugby field in a battle for supremacy!
      </div>
    </div>
  );

  const CreatePollView = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Create New Poll</h1>
          <button
            onClick={() => setCurrentView('home')}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poll Question
            </label>
            <input
              type="text"
              value={newPoll.title}
              onChange={(e) => setNewPoll(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What's your question?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>
            {newPoll.options.map((option, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...newPoll.options];
                    newOptions[index] = e.target.value;
                    setNewPoll(prev => ({ ...prev, options: newOptions }));
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Option ${index + 1}`}
                />
                {newPoll.options.length > 2 && (
                  <button
                    onClick={() => {
                      const newOptions = newPoll.options.filter((_, i) => i !== index);
                      setNewPoll(prev => ({ ...prev, options: newOptions }));
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            
            {newPoll.options.length < 6 && (
              <button
                onClick={() => setNewPoll(prev => ({ ...prev, options: [...prev.options, ''] }))}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Option
              </button>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <button
              onClick={createPoll}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Create Poll
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const PollView = () => {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Big Match 2025 Poll</h1>
        
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Voting Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <SimpleVoteForm />
            <p className='pt-2'>
              Account No : 1000592946<br/>
              Account Name : OBA St.Sylvesters <br/>
              Branch : KCC<br/>
              Bank : Commercial
            </p>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Live Results</h2>
            <Image src="/rugby.jpeg" alt="rugby" width={500} height={200}/>
            
            <div className="grid grid-cols-1 gap-4 mb-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {activePoll?.totalVotes || 0}
                </div>
                <div className="text-sm text-blue-800">Total Votes</div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Team Results</h3>
              {activePoll?.options.map((option, index) => {
                const percentage = activePoll.totalVotes > 0 ? 
                  (option.votes / activePoll.totalVotes) * 100 : 0;
                
                return (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">{option.text}</span>
                      <span className="text-xl font-bold text-blue-600">{option.votes}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {percentage.toFixed(1)}% of total votes
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-sm text-gray-500">
              This poll updates in real-time as others vote!
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Load transactions from localStorage
    useEffect(() => {
      const loadData = () => {
        try {
          const txRaw = typeof window !== 'undefined' ? localStorage.getItem('transactions') : null;
          if (txRaw) {
            const parsed = JSON.parse(txRaw);
            if (Array.isArray(parsed)) setTransactions(parsed);
          }
        } catch (error) {
          console.error('Error loading transactions:', error);
        }
      };

      loadData();
      
      // Refresh data every 2 seconds
      const interval = setInterval(loadData, 2000);
      return () => clearInterval(interval);
    }, []);

    const totalDonations = transactions.reduce((sum, t) => sum + (t.donationAmount || 0), 0);

    // Delete transaction function
    const deleteTransaction = (transactionId: string) => {
      if (!confirm('Are you sure you want to delete this vote?')) {
        return;
      }

      try {
        // Find the transaction to delete
        const transactionToDelete = transactions.find(t => t.id === transactionId);
        if (!transactionToDelete || !activePoll) {
          addNotification('Transaction not found', 'error');
          return;
        }

        // Update the poll votes (subtract the deleted votes)
        const updatedPoll = { ...activePoll };
        const teamIndex = updatedPoll.options.findIndex(opt => opt.text === transactionToDelete.supportedTeam);
        
        if (teamIndex !== -1) {
          updatedPoll.options = [...updatedPoll.options];
          updatedPoll.options[teamIndex] = {
            ...updatedPoll.options[teamIndex],
            votes: Math.max(0, updatedPoll.options[teamIndex].votes - transactionToDelete.voteWeight)
          };
          updatedPoll.totalVotes = Math.max(0, updatedPoll.totalVotes - transactionToDelete.voteWeight);
          updatedPoll.totalDonations = Math.max(0, updatedPoll.totalDonations - transactionToDelete.donationAmount);
        }

        // Remove transaction from localStorage
        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        
        // Update polls in localStorage
        const existingPolls = JSON.parse(localStorage.getItem('polls') || '[]');
        const updatedPolls = existingPolls.map((p: Poll) => 
          p.id === updatedPoll.id ? updatedPoll : p
        );
        localStorage.setItem('polls', JSON.stringify(updatedPolls));

        // Update React state
        setTransactions(updatedTransactions);
        setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
        setActivePoll(updatedPoll);

        addNotification('Vote deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        addNotification('Error deleting vote', 'error');
      }
    };

    const downloadCSV = () => {
      const headers = ['Name', 'Supported Team', 'Donation Amount', 'Vote Weight', 'Poll Title', 'Timestamp'];
      const rows = transactions.map((t) => [
        t.voterName || '',
        t.supportedTeam || '',
        String(t.donationAmount || 0),
        String(t.voteWeight || 0),
        t.pollTitle || '',
        t.timestamp ? new Date(t.timestamp).toLocaleString() : '',
      ]);

      const csv = [headers, ...rows]
        .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => setCurrentView('poll')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Poll
          </button>
          <button
            onClick={downloadCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Download CSV
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            Dashboard: {activePoll?.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">{activePoll?.totalVotes || 0}</div>
              <div className="text-blue-100">Total Votes</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">Rs. {totalDonations}</div>
              <div className="text-green-100">Total Raised</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">{transactions.length}</div>
              <div className="text-purple-100">Total Submissions</div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">{activePoll?.options?.length || 0}</div>
              <div className="text-orange-100">Teams</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Vote Distribution</h3>
              <div className="space-y-4">
                {activePoll?.options.map((option, index) => {
                  const percentage = activePoll.totalVotes > 0 ? 
                    (option.votes / activePoll.totalVotes) * 100 : 0;
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{option.text}</span>
                        <span className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                          {option.votes}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="h-3 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {percentage.toFixed(1)}% of total votes
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {transactions.slice(-10).reverse().map((t, index) => (
                  <div key={t.id || index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-800">{t.voterName}</div>
                        <div className="text-sm text-gray-600">voted for {t.supportedTeam}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">Rs. {t.donationAmount}</div>
                        <div className="text-xs text-gray-500">
                          {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No submissions yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">All Submissions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((t, index) => (
                    <tr key={t.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.voterName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.supportedTeam}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">Rs. {t.donationAmount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{t.voteWeight}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          title="Delete this vote"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500">No submissions found</div>
                  <div className="text-sm text-gray-400 mt-2">Submissions will appear here after users vote</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10 opacity-80">
        <Image
          src="/cricket-stadium.jpg"
          alt="Background"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg max-w-sm transition-all transform ${
              notification.type === 'success' 
                ? 'bg-green-500 text-white' 
                : notification.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            } animate-bounce-slow`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {notification.type === 'success' ? '✅' : 
                 notification.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <div>
                <div className="font-medium">{notification.message}</div>
                <div className="text-xs opacity-75">{notification.timestamp}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentView === 'home' && <HomeView />}
        {currentView === 'poll' && <PollView />}
        {currentView === 'create' && <CreatePollView />}
        {currentView === 'dashboard' && <DashboardView />}
      </div>
    </div>
  );
};

export default InteractiveLivePolling;