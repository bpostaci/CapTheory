/* ==========================================================
   English content overlay (same ids / step order as content.js)
   ========================================================== */
const SCENARIOS_EN = {
  normal: { title: 'A normal day', sub: 'Healthy network: C and A together',
    steps: [
      { title: 'Meet the stage',
        text: `There are three <b>nodes</b> in three cities: <b>N1 Istanbul</b>, <b>N2 New York</b>, <b>N3 London</b>. Each holds a copy (replica) of the same <code>balance</code> record: <b>100 ₺</b>.<ul>
          <li>🔵 <b>Client A</b> is connected to Istanbul, 🟠 <b>Client B</b> to London.</li>
          <li>The lines between nodes are <b>network links</b>; the coloured dots travelling on them are <b>messages</b>.</li>
          <li>The cylinder inside each card is that node's <b>disk (data store)</b>.</li></ul>
          The system is in <b class="cC">CP</b> mode: every write needs a <b>majority (2/3)</b> of acks.`,
        tip: '💡 Step through with “Next ▶”. The simulation really runs at every step — watch the messages.' },
      { title: 'A sets the balance to 150 ₺',
        text: `Client A sends a <span class="tag" style="background:#4f8cff">WRITE</span> request to Istanbul. N1 becomes the <b>coordinator</b>:<ol>
          <li>It sends <span class="tag prep">PREPARE</span> to the others.</li><li>They reply with <span class="tag ack">ACK</span>.</li>
          <li>Itself + 1 ack = <b>2/3 majority</b> → <span class="tag commit">COMMIT</span> and ✓ to the client.</li></ol>` },
      { title: 'B reads from London',
        text: `Client B asks London (N3) for the balance. To be sure, N3 sends a <span class="tag rq">QUERY</span> to a majority and returns the newest version → <b>150 ₺ ✓</b>.<br><br>Different city, same answer: that is <b class="cC">consistency (C)</b>.` },
      { title: 'The other way round: B writes, A reads',
        text: `B writes <b>120 ₺</b> from London, then A reads from Istanbul. A must see <b>120 ₺</b>.<br><br>No request was rejected → <b class="cA">availability (A)</b> is complete too. The network never split, so <b class="cP">P</b> has not been tested yet.` },
      { title: 'Summary',
        text: `<div class="summary">✅ <b>While the network is healthy, C and A can coexist.</b> Look at the gauges on the right: C ✓, A 100%.<br><br>❓ But what if a cable breaks? Then the system must choose between being <b class="cC">correct</b> and <b class="cA">answering</b>.</div>
          <div class="gnav"><button class="btn sm blue" data-open-sc="cp">CP scenario ▶</button><button class="btn sm" data-open-sc="ap">AP scenario ▶</button></div>` }
    ] },
  cp: { title: 'CP under partition', sub: 'Keep consistency, sacrifice answers',
    steps: [
      { title: 'Rule: no majority, no operation',
        text: `The system is in <b class="cC">CP</b> mode. The rule is simple: nothing is written or read unless <b>at least 2 of the 3 nodes</b> agree.<br><br>Any two majorities always overlap in at least one node, so two different “truths” can never exist.`,
        tip: 'In real life: etcd, ZooKeeper, Consul (Raft/Paxos). Bank balances, lock services.' },
      { title: 'Start: A writes 150 ₺',
        text: 'Everything is normal. The write commits with 2/3 acks and all three copies become 150 ₺.' },
      { title: '⚡ Network partition: London is cut off',
        text: `Both cables to London are cut. N3 is <b>up</b> but cannot <b>hear</b> N1 or N2.<ul>
          <li>Majority side: <b>{N1, N2}</b> → 2/3</li><li>Minority side: <b>{N3}</b> → 1/3</li></ul>
          Look at the <b>👥 Majority</b> line on the cards.` },
      { title: 'Majority side keeps writing: A → 80 ₺',
        text: `The <span class="tag prep">PREPARE</span> that N1 sends to N3 hits the wall on the cable and is lost (✕). But N2 acks → <b>2/3</b> → the write <b>succeeds</b>.<br><br>Now the <b>150 ₺ on N3 is stale</b>. Question: will N3 tell anyone that value?` },
      { title: 'Read on the minority side: B asks',
        text: `B asks London “what is the balance?”. N3 cannot reach a majority. It holds 150 ₺ but <b>cannot be sure it is the latest</b>.<br><br>The CP decision: <b>better an error than a wrong answer.</b> Watch the waiting bar above the card…` },
      { title: 'Write on the minority side: B → 200 ₺',
        text: `B tries to write. N3 cannot collect enough acks → <b>ABORTED</b>. So the two sides of the partition can <b>never</b> end up with different values (<i>split-brain</i>).` },
      { title: '🔧 Network repaired',
        text: `The cables are fixed. The nodes compare versions with <span class="tag sync">SYNC</span> messages; N3 realises it fell behind and updates to <b>80 ₺</b>.` },
      { title: 'B reads again',
        text: 'Now B gets the latest value from London: <b>80 ₺ ✓</b>.' },
      { title: 'Summary: CP',
        text: `<div class="summary"><b class="cC">C preserved:</b> no stale reads, no acknowledged write was lost.<br><b class="cA">A sacrificed:</b> during the partition the minority side (London) returned errors.<br><br>📊 Gauges on the right: C ✓, A &lt; 100%. In the timeline below, red dots are rejected requests.</div>
          <div class="gnav"><button class="btn sm" data-open-sc="ap">Same events in AP ▶</button></div>` }
    ] },
  ap: { title: 'AP under partition', sub: 'Always answer, consistency later',
    steps: [
      { title: 'Rule: every node answers on its own',
        text: `The system is in <b class="cA">AP</b> mode. A node handles a request <b>locally</b> and answers <b>immediately</b>. Copying to the other nodes happens in the background with <span class="tag repl">REPLICA</span> messages.<br><br>If a link is down, updates wait <b>📮 queued</b> (<i>hinted handoff</i>).`,
        tip: 'In real life: the best-known example is DNS; search systems in general work this way too. Databases: Cassandra, DynamoDB, Riak. Used for: shopping carts, like counters, social feeds.' },
      { title: 'Start: A writes 150 ₺',
        text: 'Compare with CP: the answer comes without waiting for acks (~1.6 s). The replicas catch up a moment later.' },
      { title: '⚡ Network partition: London is cut off',
        text: 'Same cut: N3 is up but cannot hear the others. In AP the cards say <b>⚡ Independent</b>: every node decides on its own.' },
      { title: 'A → 80 ₺ (Istanbul)',
        text: `N1 accepts at once ✓. A copy goes to N2, but the <span class="tag repl">REPLICA</span> to N3 hits the wall → <b>📮 queued</b> appears on N1's card.` },
      { title: 'B reads (London)',
        text: `N3 answers without waiting: <b>150 ₺</b>. But the real balance is 80 ₺! The client bubble shows a <b class="warn">⚠ STALE</b> warning.<br><br><b class="cA">A preserved</b> (an answer came), <b class="cC">C broken</b> (stale data).` },
      { title: 'B → 200 ₺ (London) — split-brain!',
        text: `N3 accepts this write too ✓. Now the two sides hold <b>different truths</b>: Istanbul/New York <b>80</b>, London <b>200</b>. Check the C gauge on the right: the replicas have diverged.` },
      { title: 'A reads (Istanbul)',
        text: 'A sees 80 ₺. Yet the most recent write was 200 ₺ → another <b class="warn">stale read</b>.' },
      { title: '🔧 Network repaired → conflict!',
        text: `The queues drain; 80 and 200 meet. Both came from the same old value (150) without knowing about each other: a <b>conflict ⚔</b>.<br><br>The rule is <b>LWW (last write wins)</b>: 200, with the newer timestamp, wins. The <b>80 ₺ write that A was told “succeeded” silently disappears 😱</b>.` },
      { title: 'A reads again',
        text: 'All copies have converged to <b>200 ₺</b>. This is called <b>eventual consistency</b>.' },
      { title: 'Summary: AP',
        text: `<div class="summary"><b class="cA">A preserved:</b> every request was answered instantly during the partition.<br><b class="cC">C sacrificed:</b> 2 stale reads, 1 conflict, 1 lost update.<br><br>A disaster for a bank balance; but usually acceptable for a “like counter” or a “shopping cart”.</div>
          <div class="gnav"><button class="btn sm" data-open-sc="ca">What about CA? ▶</button></div>` }
    ] },
  ca: { title: 'Why not CA?', sub: 'Assumes partitions never happen',
    steps: [
      { title: 'CA: “the network never fails” assumption',
        text: `<b class="warn">CA</b> promises to be both consistent and always available — but only <b>if partitions never happen</b>. Classic single-server databases are like this.<br><br>Our model here: a write needs <b>all nodes (3/3)</b> to ack; reads are local and fast.` },
      { title: 'Normal write: A → 150 ₺',
        text: 'Network healthy: all three nodes ack → success. So far so good.' },
      { title: 'Read: B (London)',
        text: 'Local read, fast and fresh: <b>150 ₺ ✓</b>. While the network is healthy, C + A really exist.' },
      { title: '⚡ But networks do split…',
        text: 'In the real world cables break, switches fail, cloud regions lose each other. N3 is cut off.' },
      { title: 'A tries to write 80 ₺',
        text: `N1 waits for 3/3 acks; no ack can come from N3 → <b>ABORTED</b>. Not even the majority side can write!` },
      { title: 'B reads (London)',
        text: `B reads 150 ₺. Correct (no write went through), but <b>nowhere in the system can anyone write</b>: <b class="cA">A is lost</b>.<br><br>Had N3 accepted writes on its own, <b class="cC">C</b> would have been lost instead. There is no third way.` },
      { title: '🔧 Repair and retry',
        text: 'Once the network is fixed, the same write (80 ₺) goes through without trouble.' },
      { title: 'Summary: P is not an option, it is a fact',
        text: `<div class="summary">In a distributed system you cannot “not choose” <b class="cP">P</b>; partitions happen. At that moment the system gives up either <b class="cC">C</b> or <b class="cA">A</b>. That is why, in practice, CA only describes <b>single-node</b> (non-distributed) systems.</div>
          <div class="gnav"><button class="btn sm" data-open-sc="pacelc">Bonus: PACELC ▶</button></div>` }
    ] },
  pacelc: { title: 'PACELC', sub: 'Without partitions: latency vs consistency',
    steps: [
      { title: 'There is a price even without partitions',
        text: `PACELC: if there is a <b>P</b>artition choose <b>A</b>/<b>C</b>; <b>E</b>lse (normally) choose <b>L</b>atency/<b>C</b>onsistency.<br><br>With a fully healthy network we will compare the <b>speed</b> and <b>correctness</b> of the two modes. Watch “Avg. write time” at the bottom right.` },
      { title: 'CP write: A → 150 ₺',
        text: 'A majority ack means one more round trip: about <b>3.6 s</b>. Safe but slow.' },
      { title: 'Switch to AP and write: A → 175 ₺',
        text: 'Write locally, answer at once: about <b>1.6 s</b>. Twice as fast!' },
      { title: 'A stale read WITHOUT any partition',
        text: `A writes 300 ₺; a quarter of a second later B reads from London. The copy has not reached London yet → B sees <b class="warn">175 ₺ (stale)</b>.<br><br>No cable was cut! A little consistency was traded for speed.` },
      { title: 'Summary: PACELC',
        text: `<div class="summary"><b>PA/EL</b> (Cassandra, DynamoDB): available under partition, fast normally.<br><b>PC/EC</b> (etcd, ZooKeeper, HBase): consistent under partition, consistent normally too, but slower.<br><br>So the design decision is not only for the “crisis moment” — it is made <b>every day</b>.</div>
          <div class="gnav"><button class="btn sm" data-open-sc="lab">Free lab ▶</button></div>` }
    ] },
  lab: { title: 'Free lab', sub: 'Try it yourself, break it yourself',
    steps: [
      { title: 'You are in control',
        text: `<ul><li><b>Mode</b>: pick CP / AP / CA at the top.</li>
          <li><b>Click a node</b> → crash / restart. <b>Click a link</b> → cut / repair.</li>
          <li><b>⚡ isolate N1/N2/N3</b> → ready-made partition. <b>🔧 Heal network</b> → fix everything.</li>
          <li>Write/read from the <b>Clients</b> panel on the right; change the node a client is connected to.</li></ul>
          <b>Experiment ideas:</b><ol>
          <li>In CP, isolate N3; connect B first to N3, then to N1, and read.</li>
          <li>In AP, write different values on both sides during a partition, then heal: which one won?</li>
          <li>In CP, cut only N1–N2 instead of both links. Is there still a majority?</li>
          <li>In CP, crash the coordinator node while a write is in progress.</li>
          <li>Set speed to 0.25× and watch the messages in slow motion.</li></ol>`,
        tip: 'Shortcuts: ← / → steps, Space = pause.' }
    ] }
};

const TRI_INFO_EN = {
  C: { t: 'C — Consistency',
    h: `<p>Every read sees the <b>most recent successful write</b> or gets an error. From the outside the system looks like a single copy (<i>linearizability</i>).</p>
      <div class="ex">🏦 If your balance dropped to 80 ₺ in Istanbul, the London ATM will never show 150 ₺.</div>
      <p class="muted">The price: a node that cannot be sure it is up to date cannot answer → waiting or an error.</p>` },
  A: { t: 'A — Availability',
    h: `<p><b>Every non-crashed node</b> returns a non-error response to <b>every request</b>. The response is not guaranteed to be up to date.</p>
      <div class="ex">📱 The app never says “service unavailable right now”; but it may sometimes show yesterday's data.</div>
      <p class="muted">The price: stale reads and conflicting writes during a partition.</p>` },
  P: { t: 'P — Partition tolerance',
    h: `<p>The system keeps working even when the network splits the nodes into groups that cannot talk to each other.</p>
      <div class="ex">✂️ In any system spread over more than one machine, partitions happen <b>sooner or later</b>. That is why P is mandatory in practice.</div>
      <p class="muted">The real question: when a partition happens, C or A?</p>` },
  CP: { t: 'CP — Consistent and partition tolerant',
    h: `<p>During a partition the <b>majority side</b> keeps working and the <b>minority side</b> rejects requests. Two different “truths” never exist.</p>
      <div class="chipset"><span class="chip">etcd</span><span class="chip">ZooKeeper</span><span class="chip">Consul</span><span class="chip">HBase</span><span class="chip">Spanner</span></div>
      <div class="ex">Used for: balances, inventory, locks/leader election, configuration.</div>` },
  AP: { t: 'AP — Available and partition tolerant',
    h: `<p>During a partition both sides accept reads and writes. When the link comes back the copies are reconciled (<i>eventual consistency</i>, LWW, CRDTs…).</p>
      <div class="chipset"><span class="chip star">⭐ DNS</span><span class="chip">🔍 Search systems</span><span class="chip">Cassandra</span><span class="chip">DynamoDB</span><span class="chip">Riak</span><span class="chip">CouchDB</span></div>
      <p>🌐 <b>The best-known example: DNS.</b> When you change a domain's IP address, DNS servers around the world keep serving the old record until its TTL expires — but they never say “I cannot answer”.</p>
      <p>🔍 <b>Search systems</b> follow the same logic: showing results from an index that is a few minutes old is better than showing no results at all.</p>
      <div class="ex">Used for: DNS, search results, social feeds, like counters, shopping carts, sensor data.</div>` },
  CA: { t: 'CA — Consistent and available (no partitions)',
    h: `<p>Only possible if the network <b>never splits</b>. In practice it describes single-node databases.</p>
      <div class="chipset"><span class="chip">Single-server PostgreSQL</span><span class="chip">Single-server MySQL</span></div>
      <div class="ex">The moment a partition happens, a CA system either stops (A lost) or its copies diverge (C lost).</div>` }
};

const QUIZ_EN = [
  { q: 'In a 3-node CP system, N3 becomes isolated. A client in London (N3) reads. What happens?',
    o: ['It returns its last value immediately', 'It returns an error / timeout', 'N3 automatically becomes a majority', 'The other nodes shut N3 down'],
    e: 'A CP system returns an error rather than stale data. N3 alone cannot form a majority (2/3).' },
  { q: 'What exactly does “A (Availability)” in CAP guarantee?',
    o: ['99.99% uptime', 'Always the most up-to-date answer to every request', 'Every non-crashed node returns a non-error response to every request', 'The system never crashes'],
    e: 'The A in CAP is not SLA-style uptime. The response does not even have to be up to date; it just must not be an error.' },
  { q: 'Why is “CA” not a practical option for real distributed systems?',
    o: ['Because it is too expensive', 'Network partitions are unavoidable, so P cannot be given up', 'Consistency and availability can never coexist', 'CA systems are slower'],
    e: 'While the network is healthy, C and A can coexist. But when a partition happens the system must choose; P is not “chosen”, it happens to you.' },
  { q: 'In an AP system the partition has ended and no new writes arrive. What happens to the copies?',
    o: ['They stay different forever', 'The system waits for an administrator', 'Over time they converge to the same value (eventual consistency)', 'All data is deleted'],
    e: 'Queued updates are delivered, conflicts are resolved (e.g. with LWW) and all copies reach the same value.' },
  { q: 'In a 5-node CP cluster, at least how many nodes must ack a write?',
    o: ['2', '3', '4', '5'],
    e: 'Majority = ⌊5/2⌋+1 = 3. That way any two majorities are guaranteed to overlap in at least one node.' },
  { q: 'According to PACELC, what trade-off exists when there is NO partition?',
    o: ['Latency vs Consistency', 'Availability vs Partition', 'Cost vs Performance', 'There is no trade-off'],
    e: 'In the Else case (normal operation) the choice is: low latency or strong consistency? In the simulation a CP write took ~3.6 s, an AP write ~1.6 s.' },
  { q: 'Which is more suitable for a system that stores a bank account balance?',
    o: ['AP — always answer', 'CP — reject if necessary, but never show a wrong balance', 'It does not matter', 'Neither'],
    e: 'Withdrawing money against a stale balance (double spending) is unacceptable. A brief “cannot process right now” is better.' },
  { q: 'What is the most sensible choice for a social-media “like counter”?',
    o: ['CP — every like waits for a majority ack', 'AP — the count may be a few seconds old; what matters is that it always works', 'CA', 'A single server'],
    e: 'A like count lagging a few seconds is fine; an app that throws errors drives users away.' }
];
