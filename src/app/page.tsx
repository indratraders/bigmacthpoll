'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [newPoll, setNewPoll] = useState({ title: '', options: ['', ''] });
  const [autoSimEnabled, setAutoSimEnabled] = useState(false);

  // Initialize polls (prefer localStorage if available), with a default sample
  useEffect(() => {
    const samplePolls = [
      {
        id: '1',
  
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
        if (Array.isArray(parsed)) {
          setPolls(parsed);
          return;
        }
      }
    } catch {}
    setPolls(samplePolls);
  }, []);

  // Persist polls to localStorage whenever they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('polls', JSON.stringify(polls));
      }
    } catch {}
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

  const handleUserNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  }, []);

  const handleDonationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDonationAmount(e.target.value);
  }, []);

  const submitVote = useCallback(() => {
    if (!activePoll || selectedOption === null) {
      return;
    }

    const donation = parseFloat(donationAmount) || 0;
    const voteWeight = donation > 0 ? Math.floor(donation / 10) + 1 : 1;

    const updatedPoll = { ...activePoll };
    updatedPoll.options[selectedOption].votes += voteWeight;
    updatedPoll.totalVotes += voteWeight;
    updatedPoll.totalDonations += donation;

    setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));

    // Add transaction to localStorage
    try {
      const txRaw = typeof window !== 'undefined' ? localStorage.getItem('transactions') : null;
      let txs: any[] = [];
      if (txRaw) {
        const parsed = JSON.parse(txRaw);
        if (Array.isArray(parsed)) txs = parsed;
      }
      txs.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        voterName: userName,
        supportedTeam: updatedPoll.options[selectedOption].text,
        donationAmount: donation,
        pollTitle: updatedPoll.title,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('transactions', JSON.stringify(txs));
    } catch {}

    addNotification(
      donation > 0 
        ? `Vote submitted with ${voteWeight} votes!` 
        : `Vote submitted!`,
      'success'
    );

    // Reset form
    setSelectedOption(null);
    setDonationAmount('');
    setUserName('');
  }, [activePoll, selectedOption, donationAmount, addNotification]);

  const simulateRandomVote = (poll: Poll) => {
    const randomOption = Math.floor(Math.random() * poll.options.length);
    const randomDonation = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 5 : 0;
    const voteWeight = randomDonation > 0 ? Math.floor(randomDonation / 10) + 1 : 1;

    const updatedPoll = { ...poll };
    updatedPoll.options[randomOption].votes += voteWeight;
    updatedPoll.totalVotes += voteWeight;
    updatedPoll.totalDonations += randomDonation;

    setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    
    // if (activePoll && activePoll.id === poll.id) {
    //   setActivePoll(updatedPoll);
    // }

    const randomNames = ['Alex', 'Sarah', 'Mike', 'Lisa', 'John', 'Emma', 'David', 'Jessica'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    
    addNotification(
      randomDonation > 0 
        ? `🎉 ${randomName} donated Rs. ${randomDonation} and voted!` 
        : `✅ ${randomName} voted!`,
      'success'
    );
  };

  // Auto-simulate votes every 3-8 seconds (disabled by default)
  useEffect(() => {
    if (!autoSimEnabled) return;

    const interval = setInterval(() => {
      if (polls.length > 0) {
        const randomPoll = polls[Math.floor(Math.random() * polls.length)];
        simulateRandomVote(randomPoll);
      }
    }, Math.random() * 5000 + 3000);

    return () => clearInterval(interval);
  }, [polls, activePoll, autoSimEnabled]);

  const HomeView = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h5 className="text-4xl font-bold text-gray-800 mb-2">
          Sylvester's vs Vidyartha 2025 Rugby Match 13th September
        </h5>

        
        {/* School Badges Section */}
        <div className="flex justify-center items-center gap-12 mb-4">
        <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-2 bg-gradient-to-b from-red-600 via-white to-blue-800 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-300">
              
              <Image src="/ssckk.png" alt="ssck" width={70} height={70} style={{ borderRadius: "45px" }}/>
            
            </div>
            <div className="font-bold text-red-800">Sylvester's College</div>
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
          📅 September 13th, 2025 
        </div>
        <p className="text-xl text-gray-600 mb-8">
          Vote for your predictions and support your school with donations!
        </p>
        <p className="text-xl text-gray-600 mb-8">
        This fund will be utilized for the development of college sports and will be subject to proper audit. The official account number of the Alumni Association is included here. We warmly invite all those who love sports to take part in this initiative. </p>
        <p className="text-xl text-gray-600 mb-8">
        විද්‍යාලීය ක්‍රීඩා සංවර්ධනය සදහා මෙම මුදල් යොදාගනු ලබන අතර නියමිත විගනනයට ලක්වන ආදිශිෂ්‍ය සංගමයේ නිල ගිනුම් අංකයක් මෙහි ඇතුලත් වේ ක්‍රීඩාවට ආදරය කරන සැමට මෙයට සහභාගී වීමට ආරාධනා කරමු
        </p>
        <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          🔴 LIVE: Big Match 2025 Polling Active
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
          Support your school by voting and donating! Every Rs. 100 donated = 1 extra vote
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
                  📅 {poll.matchDate}
                  {poll.venue && <div>🏟️ {poll.venue}</div>}
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{poll.totalVotes} total votes</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Currently leading:</p>
                <div className="bg-green-50 p-2 rounded-lg">
                  <span className="font-medium text-green-800">{leadingOption?.text}</span>
                  <span className="ml-2 text-green-600">({leadingOption?.votes} votes)</span>
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
          Brace Your Self for an adrenalin-charged showdown! Witness the power , passion, and brotherhood as rivals collide on the rugby filed in a battle for supremacy!
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
    const chartData = activePoll?.options.map((option, index) => ({
      name: option.text,
      votes: option.votes,
      percentage: activePoll.totalVotes > 0 ? ((option.votes / activePoll.totalVotes) * 100) : 0
    })) || [];

    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Voting Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
  
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">
                {activePoll?.totalVotes || 0} total votes
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {activePoll?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedOption(index)}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                    selectedOption === index
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{option.text}</span>
                    <div className="text-right">
                      <div className="font-bold">{option.votes}</div>
                      <div className="text-xs text-gray-500">
                        {activePoll.totalVotes > 0 ? 
                          ((option.votes / activePoll.totalVotes) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
               
                value={userName}
                onChange={handleUserNameChange}
                className="w-full border border-blue-400 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name (required)"
                required
              
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Support Your Team with a Donation
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-500 font-medium">Rs.</span>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="Minimum Rs. 100"
                  min="100"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!userName.trim()) {
                  addNotification('Please enter your name', 'error');
                  return;
                }
                if (selectedOption === null) {
                  addNotification('Please select a team', 'error');
                  return;
                }
                submitVote();
              }}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Vote Now
            </button>
                      <p className='pt-2'>Account No : 1000592946<br/>
Account Name : OBA St.Sylvesters <br/>
Branch : KCC
<br/>Bank : Commercial</p>
          </div>



          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Live Results</h2>
            <Image src="/rugby.jpeg" alt="rugby" width={500} height={200}/>
            <div className="mb-6">            

            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
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
              💡 This poll updates in real-time as others vote!
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => {
    const chartData = activePoll?.options.map((option, index) => ({
      name: option.text,
      votes: option.votes,
      color: COLORS[index % COLORS.length]
    })) || [];

    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              📊 Dashboard: {activePoll?.title}
            </h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">{activePoll?.totalVotes || 0}</div>
              <div className="text-blue-100">Total Votes</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">${activePoll?.totalDonations || 0}</div>
              <div className="text-green-100">Total Raised</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">
                {((activePoll?.totalDonations || 0) / (activePoll?.goal || 1000) * 100).toFixed(1)}%
              </div>
              <div className="text-purple-100">Goal Progress</div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
              <div className="text-3xl font-bold">{activePoll?.options?.length || 0}</div>
              <div className="text-orange-100">Options</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Vote Distribution</h3>
              <div className="h-80">
                {/* <ResponsiveContainer width="100%" height="100%"> */}
                  {/* <PieChart> */}
                    {/* <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="votes"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    > */}
                      {/* {chartData.map((entry, index) => ( */}
                        {/* <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> */}
                      {/* ))} */}
                    {/* </Pie> */}
                    {/* <Tooltip /> */}
                  {/* </PieChart> */}
                {/* </ResponsiveContainer> */}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Detailed Results</h3>
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
          </div>
        </div>
      </div>
    );
  };

  const OverlayView = () => {
    const chartData = activePoll?.options.map((option) => ({
      name: option.text.length > 15 ? option.text.substring(0, 15) + '...' : option.text,
      votes: option.votes
    })) || [];

    return (
      <div className="min-h-screen bg-black bg-opacity-90 p-4 relative">
        <div className="mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="text-white hover:text-gray-300 font-medium"
          >
            ← Back to Home
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-bold mb-2">
            🎥 Big Match 2025 - OBS Overlay Preview
          </h1>
          <p className="text-gray-300">
            Live streaming overlay for Vidyartha vs Sylvester Facebook Live
          </p>
        </div>

        {/* Main overlay positioned like it would be on stream */}
        <div className="absolute bottom-8 right-8 w-96 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-white border border-gray-600">
          <h2 className="text-lg font-bold mb-3 text-center text-yellow-400">
            {activePoll?.title}
          </h2>
          
          <div className="h-32 mb-3">
            {/* <ResponsiveContainer width="100%" height="100%"> */}
              {/* <BarChart data={chartData}> */}
                {/* <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'white' }}
                  axisLine={{ stroke: 'white' }}
                /> */}
                {/* <YAxis 
                  tick={{ fontSize: 10, fill: 'white' }}
                  axisLine={{ stroke: 'white' }}
                /> */}
                {/* <Bar dataKey="votes" fill="#60A5FA" /> */}
              {/* </BarChart> */}
            {/* </ResponsiveContainer> */}
          </div>

          <div className="space-y-2 mb-3">
            {activePoll?.options.map((option, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-white">{option.text}</span>
                <span className="font-bold text-blue-300">{option.votes}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-600">
            <div className="flex justify-start text-sm">
              <span className="text-gray-300">Votes: {activePoll?.totalVotes || 0}</span>
            </div>
          </div>

          <div className="mt-2 text-center text-xs text-yellow-300 animate-pulse">
            🔴 LIVE POLL
          </div>
        </div>

        {/* Sample donation alert */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-red-500 text-white p-6 rounded-lg shadow-2xl animate-pulse border-2 border-yellow-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🏏</div>
            <div className="text-xl font-bold">Big Match 2025 Donation!</div>
            <div className="text-lg">Rs. 500.00</div>
            <div className="text-sm opacity-90">5 votes added to "Vidyartha College 🦁"</div>
            <div className="text-xs mt-2 text-yellow-200">
              Live donation alerts during the stream!
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
        {currentView === 'create' && <CreatePollView />}
        {currentView === 'poll' && <PollView />}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'overlay' && <OverlayView />}
      </div>

    
    </div>
  );
};

export default InteractiveLivePolling;
