/*
DSMaster
Twitch to YT Player - content.js
2/3/26
V1.0
*/

(() => {
  const BUTTON_ID = "yt-replace-player-btn";
  const EXISTING_CHANNEL = "existing-channel"; //if yt player, set this to control page reloads and prevent overwriting the youtube player
  const PAGE_TITLE_SELECTOR = "title"; //used for titleobserver (main detector)

  if (!localStorage.getItem("twitch-youtube-replace")) {
    localStorage.setItem("twitch-youtube-replace", JSON.stringify({
      "/gofns": "UC0l4egqFkC7XQvZFW1qajPg",
      "/tarik": "UCTbtlMEiBfs0zZLQyJzR0Uw",
      "/s0mcs": "UCTnJKbo-2kW1B7L_doko5iQ",
      "/alveussanctuary": "UCbJ-1yM55NHrR1GS9hhPuvg"
    }));
  }
  const ALWAYS_CHANGE = JSON.parse(localStorage.getItem("twitch-youtube-replace"));
  
  {
    
  }
  var ALWAYS_CHANGE_FLAG = true; //set this to false to blanket disable the always change functionality

  //bugs:
  //potfix 1. after replaced, if title changes (e.g. notification), it reloads; maybe use localstorage?
  //potfix 2. always_change channels = constant reload

  function extractYouTubeId(url) {
    try {
      const u = new URL(url);

      if (u.hostname === "youtu.be") {
        return u.pathname.slice(1);
      }

      if (u.hostname.includes("youtube.com")) {
        return u.searchParams.get("v");
      }

      return null;
    } catch {
      return null;
    }
  }

  function getPlayerContainer() {
    return document.querySelector(
      '[data-a-target="video-ref"]' //this is the player selector found from dom i just looked for the one with the <video> tag
    );
  }

  function replaceTwitchPlayer(youtubeId) {
    const container = getPlayerContainer();
    if (!container) return;

    //just refresh if need to change url ig; could NOT return but would have to change the title observer to check for the attribute so it doesn't override when the title changes
    if (container.hasAttribute(EXISTING_CHANNEL)) return;
    container.setAttribute(EXISTING_CHANNEL, window.location.pathname.toLowerCase());

    container.innerHTML = ""; //clear the div of the existing video blob

    const iframe = document.createElement("iframe");
    if (youtubeId.startsWith('UC')) {
      //potentially need &mute=1 appended b/c browsers won't autoplay? without it still works for me though
      iframe.src = `https://www.youtube.com/embed/live_stream?channel=${youtubeId}&autoplay=1`;
    } else {
      iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
    }
    iframe.allow =
      "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;

    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";

    container.style.position = "relative";
    container.appendChild(iframe); //add yt to the div
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return; //idk if this is nec but might prevent dupe buttons bc twitch is an SPA ?
    const headerRight = document.querySelector(
      '[data-target="channel-header-right"]' //selector from dom just the div that has the follow/sub/bits buttons
    );
    if (!headerRight) {
      //hacky and i'd rather just fire the event when everything is loaded but react hydration is killing me
      //trying to remain lightweight; not sure how performant an entire mutationobserver on the dom would be (this would work though and prevent this hacky settimeout)
      //tested with throttling and it still worked even when network speed not perfect; should be fine
      setTimeout(injectButton, 3000); 
      return;
    }

    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.textContent = "Replace Player";
    btn.style.marginLeft = "8px";
    btn.style.padding = "6px 20px";
    btn.style.borderRadius = "9000px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.color = "white";
    btn.style.background = "#9146FF"; //set button color on first load otherwise it'll be blank until mouse enters (see below listener)
    btn.style.fontSize = "1.4rem"; //all these values found from css inspection on dev tools
    btn.style.fontWeight = "600"; //semibold
    btn.style.height = "3.2rem";
    
    //color style changes (should be :hover css class but ion wanna add a css file or append it jankily rn)
    btn.addEventListener("mouseenter", function(
      event ) {
        event.target.style.background = "#772ce8"
      }, false);
    btn.addEventListener("mouseleave", function(
      event ) {
        event.target.style.background = "#9146FF"
      }, false);

    //main button function
    btn.onclick = () => {
      const link = prompt("Paste YouTube link:");
      if (!link) return;

      const videoId = extractYouTubeId(link);
      if (!videoId) {
        alert("Invalid YouTube link: no video ID.");
        return;
      }

      //call main replace function
      replaceTwitchPlayer(videoId);
    };

    headerRight.appendChild(btn);

    //the below never worked because the div (and thus button) was always technically added even though it would be removed after react hydration
    // if (!document.getElementById(BUTTON_ID) && window.location.pathname !== '/' && !window.location.pathname.startsWith('/directory')) {
    //   setTimeout(injectButton, 500);
    // }
  }

  //main stream change "detector" to inject/re-inject button
  const titleObserver = new MutationObserver(() => {
    const channel = window.location.pathname.toLowerCase();
    const container = getPlayerContainer();
    if (container && container.hasAttribute(EXISTING_CHANNEL) && container.getAttribute(EXISTING_CHANNEL) != channel) { //middle condition short circuits to prevent errors
      //if youtube player has been added, force page reload; otherwise, leave default behavior
      window.location.reload();
    }

    
    if (channel == "/") { //doing this after the above so that if you go back to twitch homepage, the reload still occurs; although the mini player counts as the container i think
      return;
    }

    injectButton(); //after page has loaded (swapping between streams or reloading), inject button
    if (ALWAYS_CHANGE_FLAG && channel in ALWAYS_CHANGE) {
      replaceTwitchPlayer(ALWAYS_CHANGE[channel]);
    }
  });
  const titleElement = document.querySelector(PAGE_TITLE_SELECTOR);
  titleObserver.observe(titleElement, { childList: true });

  //don't inject on the homepage; alternatively, i could put this check in the injectButton function and just call the func here unconditionally
  if (window.location.pathname != "/") {
    injectButton();
  }
})();
