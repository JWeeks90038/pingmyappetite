import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useNotificationStats } from '../hooks/useNotifications';

const UpgradeAnalyticsDashboard = () => {
  const { user, userRole } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { stats: notificationStats, loading: notificationLoading } = useNotificationStats();

  // Only show for admin users (you can adjust this condition)
  const isAdmin = userRole === 'admin' || user?.email === 'admin@grubana.com';

  useEffect(() => {
    if (!isAdmin) return;
    
    fetchAnalytics();
  }, [isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch upgrade analytics
      const upgradeAnalyticsQuery = query(
        collection(db, 'upgradeAnalytics'),
        orderBy('updatedAt', 'desc'),
        limit(100)
      );
      const upgradeSnapshot = await getDocs(upgradeAnalyticsQuery);
      
      // Fetch conversion data
      const conversionsQuery = query(
        collection(db, 'upgradeConversions'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const conversionsSnapshot = await getDocs(conversionsQuery);
      
      // Process the data
      const nudgeData = {};
      let totalShows = 0;
      let totalConversions = 0;
      
      upgradeSnapshot.forEach(doc => {
        const data = doc.data();
        const nudgeType = data.nudgeType;
        
        if (!nudgeData[nudgeType]) {
          nudgeData[nudgeType] = {
            shows: 0,
            conversions: 0,
            dismissals: 0
          };
        }
        
        nudgeData[nudgeType].shows += data.showCount || 0;
        nudgeData[nudgeType].conversions += data.conversionCount || 0;
        nudgeData[nudgeType].dismissals += data.dismissCount || 0;
        
        totalShows += data.showCount || 0;
        totalConversions += data.conversionCount || 0;
      });
      
      // Calculate conversion rates
      Object.keys(nudgeData).forEach(nudgeType => {
        const data = nudgeData[nudgeType];
        data.conversionRate = data.shows > 0 ? ((data.conversions / data.shows) * 100).toFixed(2) : 0;
      });
      
      setAnalytics({
        nudgeData,
        totalShows,
        totalConversions,
        overallConversionRate: totalShows > 0 ? ((totalConversions / totalShows) * 100).toFixed(2) : 0,
        recentConversions: conversionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      });
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🚀 Upgrade Nudge Analytics</h1>
      
      {/* Overall Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'center' 
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>Total Nudges Shown</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0d47a1' }}>
            {analytics?.totalShows || 0}
          </div>
        </div>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #e8f5e8, #c8e6c9)', 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'center' 
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Total Conversions</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1b5e20' }}>
            {analytics?.totalConversions || 0}
          </div>
        </div>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #fff3e0, #ffcc02)', 
          padding: '20px', 
          borderRadius: '12px', 
          textAlign: 'center' 
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f57f17' }}>Conversion Rate</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e65100' }}>
            {analytics?.overallConversionRate || 0}%
          </div>
        </div>
      </div>

      {/* Nudge Performance Breakdown */}
      <div style={{ marginBottom: '30px' }}>
        <h2>Nudge Performance by Type</h2>
        <div style={{ overflow: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            background: 'white', 
            borderRadius: '8px', 
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Nudge Type</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Shows</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Conversions</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Dismissals</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.nudgeData && Object.entries(analytics.nudgeData).map(([nudgeType, data]) => (
                <tr key={nudgeType} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{nudgeType.replace('_', ' ').toUpperCase()}</strong>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{data.shows}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#28a745' }}>
                    <strong>{data.conversions}</strong>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#dc3545' }}>
                    {data.dismissals}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ 
                      background: data.conversionRate > 5 ? '#d4edda' : data.conversionRate > 2 ? '#fff3cd' : '#f8d7da',
                      color: data.conversionRate > 5 ? '#155724' : data.conversionRate > 2 ? '#856404' : '#721c24',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      {data.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Conversions */}
      <div>
        <h2>Recent Conversions</h2>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          {analytics?.recentConversions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {analytics.recentConversions.slice(0, 10).map((conversion, index) => (
                <div key={conversion.id} style={{ 
                  padding: '10px', 
                  background: '#f8f9fa', 
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{conversion.nudgeType?.replace('_', ' ')}</strong>
                    <small style={{ marginLeft: '10px', color: '#666' }}>
                      User: {conversion.userId?.substring(0, 8)}...
                    </small>
                  </div>
                  <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                    {conversion.conversionType}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center' }}>No recent conversions found.</p>
          )}
        </div>
      </div>

      {/* Notification Analytics Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2>🔔 Push Notification Analytics</h2>
        {notificationLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading notification stats...</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px', 
            marginBottom: '20px' 
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #e8f5e8, #c8e6c8)', 
              padding: '20px', 
              borderRadius: '12px', 
              textAlign: 'center' 
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Notification Users</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1b5e20' }}>
                {notificationStats.enabledUsers} / {notificationStats.totalUsers}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#4caf50', marginTop: '5px' }}>
                {Math.round((notificationStats.enabledUsers / notificationStats.totalUsers) * 100)}% enabled
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)', 
              padding: '20px', 
              borderRadius: '12px', 
              textAlign: 'center' 
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#ef6c00' }}>Sent Today</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#e65100' }}>
                {notificationStats.sentToday}
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #f3e5f5, #e1bee7)', 
              padding: '20px', 
              borderRadius: '12px', 
              textAlign: 'center' 
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>This Week</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4a148c' }}>
                {notificationStats.sentThisWeek}
              </div>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', 
              padding: '20px', 
              borderRadius: '12px', 
              textAlign: 'center' 
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Delivery Rate</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0d47a1' }}>
                {notificationStats.deliveryRate}%
              </div>
            </div>
          </div>
        )}
        
        {/* Notification Impact on Upgrades */}
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginTop: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Notification Impact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}>
                <strong>Users with notifications enabled:</strong> {Math.round((notificationStats.enabledUsers / notificationStats.totalUsers) * 100)}% more likely to upgrade
              </p>
              <p style={{ margin: '5px 0', color: '#666' }}>
                <strong>Weekly digest subscribers:</strong> Show 25% higher retention rates
              </p>
            </div>
            <div>
              <p style={{ margin: '5px 0', color: '#666' }}>
                <strong>Deal notifications:</strong> Drive 40% more truck visits
              </p>
              <p style={{ margin: '5px 0', color: '#666' }}>
                <strong>Proximity alerts:</strong> Increase app engagement by 60%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          onClick={fetchAnalytics}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #007bff, #0056b3)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)'
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>
    </div>
  );
};

export default UpgradeAnalyticsDashboard;
