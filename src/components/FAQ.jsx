import React from 'react';
import '../assets/FAQ.css'; // Optional: Add custom styling here

const FAQ = () => {
  const faqData = [
    {
      category: "For Users",
  questions: [
    {
      q: "What is Grubana?",
      a: 
        "Grubana is a live, interactive discovery platform that connects you to food trucks, trailers, and carts in real time. Explore mobile kitchens by cuisine, popularity, or time of day—and influence where they go next with a simple ping."
    },
    {
      q: "How do I find food trucks near me?",
      a: 
        "Open the Grubana map in our app or on the website. Use filters like cuisine type, trending status, or time of day to see what's active nearby. Trucks update in real time, so you're always in the know."
    },
    {
      q: "What are 'pings'?",
      a: 
        "Pings are signals of interest you send by dropping a pin or interacting with a mobile kitchen on the map. The more pings a truck gets, the more visibility it gains—and the more likely it is to show up near you!"
    },
    {
      q: "What are ‘drops’?",
      a: 
        "Drops are time-limited deals or menu specials that food truck owners release for nearby fans. Keep an eye out for exclusive offers you can only grab through the app!"
    },
    {
      q: "Can I save or follow my favorite trucks?",
      a: 
        "Yes! Add trucks to your favorites to get notified when they’re nearby, drop new menus, or offer special deals. It’s the easiest way to stay connected with your go-to spots."
    },
    {
      q: "Is it free to use Grubana?",
      a: 
        "Absolutely. Grubana is 100% free for foodies who want to discover and follow their favorite mobile kitchens."
    },
    {
      q: "Are there reviews or ratings?",
      a: 
        "While Grubana focuses on real-time engagement over reviews, we’re exploring community-based features like badges and check-ins in future updates."
    },
  ],
    },
    {
  category: "For Food Truck Owners",
  questions: [
    {
      q: "What can Grubana do for my business?",
      a: 
        "Grubana helps mobile kitchen owners attract local demand, track real-time interest through pings, release targeted drops, and analyze performance with built-in heatmaps and location-based analytics."
    },
    {
      q: "How do I get my truck on Grubana?",
      a: 
        "Register through our owner dashboard, build your truck profile, and start showing up on the live map whenever you're active. You’ll immediately begin seeing pin drops and customer demand near you."
    },
    {
      q: "Do I need to update my location manually?",
      a: 
        "You can either update manually through the dashboard or connect your GPS to keep your location synced in real time."
    },
    {
      q: "What are pings and how do they help?",
      a: 
        "Pings are real-time interest signals from users. They help you identify high-demand areas, make smarter routing decisions, and increase your visibility to local foodies."
    },
    {
      q: "What are drops and how can I use them?",
      a: 
        "Drops let you create limited-time deals or announcements that alert fans nearby. It’s a powerful tool to boost foot traffic fast and reward loyal followers."
    },
    {
      q: "What kind of analytics do I get?",
      a: 
        "Premium accounts unlock detailed analytics including heatmaps, popular visit times, location-based engagement trends, and user behavior insights over the last 30 days."
    },
    {
      q: "How much does it cost for truck owners?",
      a: 
        "There’s a free tier to get you started. Premium features like drops, advanced analytics, and boosted visibility are part of our subscription plan for serious growth."
    },
    {
      q: "Can I promote my truck on Grubana?",
      a: 
        "Yes! Our premium tier includes boosted map placement, featured listings, time-locked menu drops, and more tools to grow your following."
    },
  ],
},
    {
  category: "General",
  questions: [
    {
      q: "Is Grubana available in all cities?",
      a: 
        "We're rapidly expanding in major metro areas. Don’t see trucks near you yet? Invite your favorite local vendors or suggest your city—we're always adding new zones based on community interest."
    },
    {
      q: "How is Grubana different from food truck booking platforms?",
      a: 
        "Grubana isn’t about catering bookings. We focus on live discovery, fan interaction, data-driven growth, and helping mobile kitchens thrive on the streets—not in private events."
    },
    {
      q: "How do I contact support?",
      a: 
        "We’re here to help! Reach out any time at support@grubana.com."
    },
  ],
},
  ];

  return (
    <div className="faq-page">
      <h1>Grubana FAQ</h1>
      {faqData.map((section, i) => (
        <div key={i} className="faq-section">
          <h2>{section.category}</h2>
          {section.questions.map((item, j) => (
            <div key={j} className="faq-item">
              <h3 className="faq-question">{item.q}</h3>
              <p className="faq-answer">{item.a}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default FAQ;
