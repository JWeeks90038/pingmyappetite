import React from 'react';
import '../assets/FAQ.css'; // Optional: Add custom styling here


const FAQ = () => {
  const faqData = [
    {
      category: "For Foodies",
      questions: [
        {
          q: "What is Grubana?",
          a:
            "Grubana is a real-time discovery platform for food trucks and trailers. It helps you find local mobile kitchens, see what they’re serving, and grab exclusive time-limited deals called 'drops' — all from an interactive live map."
        },
        {
          q: "How do I find food trucks near me?",
          a:
            "View the map on your dashboard. You'll see icons representing active food trucks and trailers near your location. Use filters like cuisine type to discover what's cooking nearby."
        },
        {
          q: "What do the icons on the map mean?",
          a:
            "Each icon represents a different type of mobile kitchen. When a drop is available, foodie fans will see the icon change color (blue for food trucks and green for trailers) to indicate a special offer is live — foodie fans can tap it to view details."
        },
        {
          q: "What are 'pings' and how do they work?",
          a:
            "Pings let you signal interest in a truck or trailer you want to see nearby. Each user gets 3 pings per day, which they can drop anywhere on the map. The more pings for a specific cusines in a certain area, the more likely a food truck or trailer will head there. Pings will show up as heatmap colors on the vendor map."
        },
        {
          q: "What are 'drops'?",
          a:
            "Drops are time-limited deals or menu specials that vendors offer to nearby users. When a truck or trailer creates a drop, their icon changes color (blue for food trucks and green for trailers) to signal something special is happening. Tap the icon to view the drop and claim it before time runs out."
        },
        {
          q: "How do I claim a drop?",
          a:
            "When you see a drop, tap the vendor's icon and hit 'Claim Drop.' You’ll receive a unique code. Show this code to the vendor when ordering to redeem the deal. Each drop is limited and tracked, so be sure to use the code correctly and before it expires."
        },
        {
          q: "Can I view menus before visiting?",
          a:
            "Yes. Tap any vendor icon to view their live menu, drops, hours, cuisine type and location. Some menus update in real-time based on availability, deals they’re offering and when they update their menu."
        },
        {
          q: "Can I follow or save my favorite vendors?",
          a:
            "Absolutely! Tap the Add To Favorites button below the menu for each vendor to save them to your favorites. Vendors will also see when a fan has added them as a favorite."
        },
        {
          q: "Is Grubana free for users?",
          a:
            "Yes, Grubana is completely free for food lovers to explore, ping, follow, and claim drops."
        },
      ],
    },
    {
      category: "For Food Trucks & Food Trailers",
      questions: [
        {
          q: "What can Grubana do for my business?",
          a:
            "Grubana helps you gain visibility, attract nearby customers in real time, release time-sensitive deals (drops), and track engagement with analytics like heatmaps and ping activity."
        },
        {
          q: "How do I get my truck or trailer on Grubana?",
          a:
            "Click Sign Up. Create your profile, upload a photo of your truck or trailer and photo (or PDF) of menu, and go live to appear on the interactive map. You can update your location manually with the Basic Plan or you can have full geolocation avtivity with the All-Access Plan. Your icon will disappear when you toggle your icon to hide or when you log out."
        },
        {
          q: "How does the heatmap work?",
          a:
            "The heatmap shows where foodies are most active with pings. This helps you see trending areas and helps vendors understand where demand is growing."
        },
        {
          q: "What are pings and how do I use them?",
          a:
            "Pings are signals from users showing interest in having you nearby. You’ll see where the demand is, helping you make smarter location decisions and maximize foot traffic."
        },
        {
          q: "What are drops and how can I use them?",
          a:
            "Drops are limited-time offers you can launch directly from your dashboard. Choose a deal (e.g., 'Free Drink with Any Order'), set a time limit, and alert nearby users. Your icon will change color on the map to grab attention."
        },
        {
          q: "How do users claim my drop?",
          a:
            "Once a user claims your drop, they get a one-time code. Ask them to show this code when ordering, and mark it as redeemed. This ensures each drop is properly tracked and honored."
        },
        {
          q: "What kind of analytics are available?",
          a:
            "Premium vendors get access to heatmaps, ping activity, favorite counts, and historical data over the last 7 & 30 days and more detailed analytics — all designed to optimize your routes and sales."
        },
        {
          q: "How much does it cost to use Grubana?",
          a:
            "We offer a free basic profile to get you started. All-access plan include live geolocation, analytics, drop campaigns and boosted visibility."
        },
        {
          q: "Can I promote my business on Grubana?",
          a:
            "Comming soon!! We will be offering promotional opportunities for vendors to boost their visibility and reach more foodies through targeted campaigns and featured listings."
        },
        {
          q: "Can I link my social media pages to my account?",
          a:
            "Yes! Foodie fans can select your social media icon located below your menu when they click on your truck or trailer icon which will direct them to your social media page. Your social media icons will also be located at the bottom of your dashboard for your access as well."
        },
      ],
    },
    {
      category: "General",
      questions: [
        {
          q: "Is Grubana available in my city?",
          a:
            "We’re launching in select metro areas first and expanding based on user demand. Don’t see any trucks nearby yet? Invite your favorite vendors or suggest your city on our site!"
        },
        {
          q: "How is Grubana different from food truck booking sites?",
          a:
            "Grubana is not a catering platform. We focus on live discovery, community-driven demand, and real-time deals — helping mobile kitchens succeed in public spaces, not private events."
        },
        {
          q: "How can I contact support?",
          a:
            "You can reach our support team at any time by emailing us at flavor@grubana.com."
        },
      ],
    },
  ];

  return (
    <div className="faq-page">
      <div id="top"></div>
      <h1>Frequently Asked Questions</h1>
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

      <a
  href="#"
  onClick={e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  style={{
    display: "inline-block",
    margin: "30px auto 0 auto",
    color: "#2c6f57",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold"
  }}
>
  Back to Top ↑
</a>
    </div>
  );
};

export default FAQ;