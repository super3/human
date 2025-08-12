(function () {
  // Set our main variables
  let scene,
  renderer,
  camera,
  model, // Our character
  neck, // Reference to the neck bone in the skeleton
  waist, // Reference to the waist bone in the skeleton
  possibleAnims, // Animations found in our file
  mixer, // THREE.js animations mixer
  idle, // Idle, the default state our character returns to
  clock = new THREE.Clock(), // Used for anims, which run to a clock instead of frame rate 
  currentlyAnimating = false, // Used to check whether characters neck is being used in another anim
  raycaster = new THREE.Raycaster(), // Used to detect the click on our character
  loaderAnim = document.getElementById('js-loader');

  init();

  function init() {

    const MODEL_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';
    const canvas = document.querySelector('#c');
    const backgroundColor = 0xf1f1f1;

    // Init the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // Init the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Add a camera
    camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000);

    camera.position.z = 30;
    camera.position.x = 0;
    camera.position.y = -3;

    let stacy_txt = new THREE.TextureLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg');
    stacy_txt.flipY = false;

    const stacy_mtl = new THREE.MeshPhongMaterial({
      map: stacy_txt,
      color: 0xffffff,
      skinning: true });



    var loader = new THREE.GLTFLoader();

    loader.load(
    MODEL_PATH,
    function (gltf) {
      model = gltf.scene;
      let fileAnimations = gltf.animations;

      model.traverse(o => {

        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material = stacy_mtl;
        }
        // Reference the neck and waist bones
        if (o.isBone && o.name === 'mixamorigNeck') {
          neck = o;
        }
        if (o.isBone && o.name === 'mixamorigSpine') {
          waist = o;
        }
      });

      model.scale.set(7, 7, 7);
      model.position.y = -11;

      scene.add(model);

      loaderAnim.remove();

      mixer = new THREE.AnimationMixer(model);

      let clips = fileAnimations.filter(val => val.name !== 'idle');
      possibleAnims = clips.map(val => {
        let clip = THREE.AnimationClip.findByName(clips, val.name);

        clip.tracks.splice(3, 3);
        clip.tracks.splice(9, 3);

        clip = mixer.clipAction(clip);
        return clip;
      });


      let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');

      idleAnim.tracks.splice(3, 3);
      idleAnim.tracks.splice(9, 3);

      idle = mixer.clipAction(idleAnim);
      idle.play();

    },
    undefined, // We don't need this function
    function (error) {
      console.error(error);
    });


    // Add lights
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    hemiLight.position.set(0, 50, 0);
    // Add hemisphere light to scene
    scene.add(hemiLight);

    let d = 8.25;
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    // Add directional Light to scene
    scene.add(dirLight);


    // Floor
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xeeeeee,
      shininess: 0 });


    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;
    scene.add(floor);

    let geometry = new THREE.SphereGeometry(8, 32, 32);
    let material = new THREE.MeshBasicMaterial({ 
      color: 0xb3d4f5,  // Lighter blue
      opacity: 0.8,
      transparent: true
    }); 
    let sphere = new THREE.Mesh(geometry, material);

    sphere.position.z = -15;
    sphere.position.y = -2.5;
    sphere.position.x = -0.25;
    scene.add(sphere);
  }


  function update() {
    if (mixer) {
      mixer.update(clock.getDelta());
    }

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  update();

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;

    const needResize =
    canvasPixelWidth !== width || canvasPixelHeight !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    return needResize;
  }

  window.addEventListener('click', e => raycast(e));
  window.addEventListener('touchend', e => raycast(e, true));

  function raycast(e, touch = false) {
    var mouse = {};
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    var intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects[0]) {
      var object = intersects[0].object;

      if (object.name === 'stacy') {

        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playOnClick();
        }
      }
    }
  }

  // Get a random animation, and play it 
  function playOnClick() {
    let anim = Math.floor(Math.random() * possibleAnims.length) + 0;
    playModifierAnimation(idle, 0.25, possibleAnims[anim], 0.25);
  }


  function playModifierAnimation(from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce);
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true);
    setTimeout(function () {
      from.enabled = true;
      to.crossFadeTo(from, tSpeed, true);
      currentlyAnimating = false;
    }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000);
  }

  document.addEventListener('mousemove', function (e) {
    var mousecoords = getMousePos(e);
    if (neck && waist) {

      moveJoint(mousecoords, neck, 50);
      moveJoint(mousecoords, waist, 30);
    }
  });

  function getMousePos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  function moveJoint(mouse, joint, degreeLimit) {
    let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
    joint.rotation.y = THREE.Math.degToRad(degrees.x);
    joint.rotation.x = THREE.Math.degToRad(degrees.y);
  }

  function getMouseDegrees(x, y, degreeLimit) {
    let dx = 0,
    dy = 0,
    xdiff,
    xPercentage,
    ydiff,
    yPercentage;

    let w = { x: window.innerWidth, y: window.innerHeight };

    // Left (Rotates neck left between 0 and -degreeLimit)
    // 1. If cursor is in the left half of screen
    if (x <= w.x / 2) {
      // 2. Get the difference between middle of screen and cursor position
      xdiff = w.x / 2 - x;
      // 3. Find the percentage of that difference (percentage toward edge of screen)
      xPercentage = xdiff / (w.x / 2) * 100;
      // 4. Convert that to a percentage of the maximum rotation we allow for the neck
      dx = degreeLimit * xPercentage / 100 * -1;
    }

    // Right (Rotates neck right between 0 and degreeLimit)
    if (x >= w.x / 2) {
      xdiff = x - w.x / 2;
      xPercentage = xdiff / (w.x / 2) * 100;
      dx = degreeLimit * xPercentage / 100;
    }
    // Up (Rotates neck up between 0 and -degreeLimit)
    if (y <= w.y / 2) {
      ydiff = w.y / 2 - y;
      yPercentage = ydiff / (w.y / 2) * 100;
      // Note that I cut degreeLimit in half when she looks up
      dy = degreeLimit * 0.5 * yPercentage / 100 * -1;
    }
    // Down (Rotates neck down between 0 and degreeLimit)
    if (y >= w.y / 2) {
      ydiff = y - w.y / 2;
      yPercentage = ydiff / (w.y / 2) * 100;
      dy = degreeLimit * yPercentage / 100;
    }
    return { x: dx, y: dy };
  }

})();

// Live Streaming Chat functionality with Groq API
(function() {
  // Use backend API endpoint (no API key needed in frontend!)
  // Automatically detect environment
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.protocol === 'file:';
  
  const API_ENDPOINT = isLocalDev 
    ? 'http://localhost:3001/api/chat'  // Local development
    : '/api/chat';  // Production (Vercel or other hosting)
  
  console.log('Using API endpoint:', API_ENDPOINT);
  
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');
  const viewerCount = document.getElementById('viewer-count');
  
  // Simulated usernames for the stream
  const usernames = [
    'GamerPro92', 'TechNinja', 'CodeWizard', 'PixelQueen', 'StreamFan',
    'NightOwl', 'CyberPunk', 'DigitalDreamer', 'CloudSurfer', 'ByteMaster',
    'QuantumLeap', 'NeonVibes', 'ElectricSoul', 'DataDancer', 'VirtualVoyager'
  ];
  
  // User colors for avatars - blue theme variations
  const userColors = [
    '#5e8fc7', '#7aa3d4', '#4a7ab5', '#6b94cc', '#8eb1dc',
    '#3d6ca8', '#9fbfe5', '#527fb8', '#b3d4f5', '#4573b0',
    '#5a89c0', '#7095c8', '#86a8d5', '#658fc5', '#4d7bb5'
  ];
  
  // Current user info
  const currentUser = {
    name: usernames[Math.floor(Math.random() * usernames.length)] + Math.floor(Math.random() * 1000),
    color: userColors[Math.floor(Math.random() * userColors.length)]
  };
  
  // Store conversation history for AI
  let conversationHistory = [
    {
      role: "system",
      content: "You are Nova, an AI personality participating in a live stream chat. You're friendly, entertaining, and interact naturally with viewers. Keep responses brief (1-2 sentences) like in a fast-moving chat. Sometimes react with emojis or short exclamations. You're part of the stream and love engaging with the community."
    }
  ];

  function addMessage(text, userName, userColor, isAI = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isAI ? 'ai-message' : ''}`;
    
    // Avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.style.background = userColor || '#666';
    avatarDiv.textContent = userName ? userName[0].toUpperCase() : 'U';
    
    // Content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Header with username and timestamp
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const authorSpan = document.createElement('span');
    authorSpan.className = 'message-author';
    authorSpan.textContent = userName;
    if (isAI) {
      authorSpan.style.color = '#5e8fc7';
    } else {
      authorSpan.style.color = userColor;
    }
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'message-timestamp';
    const now = new Date();
    timestampSpan.textContent = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
    
    headerDiv.appendChild(authorSpan);
    headerDiv.appendChild(timestampSpan);
    
    // Message text
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(textDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add emoji reactions randomly for some messages
    if (Math.random() < 0.1 && !isAI) {
      setTimeout(() => addEmojiReaction(messageDiv), Math.random() * 2000);
    }
  }
  
  function addEmojiReaction(messageElement) {
    const emojis = ['❤️', '😂', '🔥', '👏', '💯', '🎉', '✨', '🚀'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const emojiDiv = document.createElement('div');
    emojiDiv.className = 'emoji-rain';
    emojiDiv.textContent = emoji;
    messageElement.appendChild(emojiDiv);
    
    setTimeout(() => emojiDiv.remove(), 3000);
  }

  async function getGroqResponse(recentMessages) {
    // Create a context-aware message for the AI
    const chatContext = recentMessages.map(msg => `${msg.user}: ${msg.text}`).join('\n');
    const prompt = `Recent chat:\n${chatContext}\n\nRespond naturally to the conversation.`;
    
    conversationHistory.push({ role: "user", content: prompt });
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Add AI response to history
      conversationHistory.push({ role: "assistant", content: aiResponse });
      
      // Keep conversation history manageable
      if (conversationHistory.length > 15) {
        conversationHistory = [
          conversationHistory[0], // Keep system message
          ...conversationHistory.slice(-14)
        ];
      }
      
      return aiResponse;
    } catch (error) {
      console.error('Error calling API:', error);
      return null; // Silently fail in streaming context
    }
  }

  // Track recent messages for context
  let recentMessages = [];
  
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      // Add user message
      addMessage(message, currentUser.name, currentUser.color);
      recentMessages.push({ user: currentUser.name, text: message });
      if (recentMessages.length > 10) recentMessages.shift();
      
      // Clear input
      chatInput.value = '';
      chatInput.focus();
      
      // AI responds to user messages
      setTimeout(async () => {
        const aiResponse = await getGroqResponse(recentMessages);
        if (aiResponse) {
          addMessage(aiResponse, 'Nova', '#5e8fc7', true);
          recentMessages.push({ user: 'Nova', text: aiResponse });
          if (recentMessages.length > 10) recentMessages.shift();
        }
      }, 1000 + Math.random() * 1000);
    }
  }
  
  // Removed simulated viewer messages
  
  // Removed viewer count updates

  // Event listeners
  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Initialize chat
  console.log('Live stream chat initialized. User:', currentUser.name);
  
  // Welcome message from AI
  setTimeout(() => {
    addMessage('Hello! I\'m Nova. Great to see you here! How\'s it going?', 'Nova', '#5e8fc7', true);
  }, 1000);
})();