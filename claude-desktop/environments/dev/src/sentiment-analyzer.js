/**
 * Simple Sentiment Analyzer for Claude Desktop
 * 
 * Analyzes text content to detect emotions and sentiments 
 * for appropriate robot face expressions.
 */

class SentimentAnalyzer {
  constructor() {
    // Emotion keyword dictionaries with weighted scores
    this.emotionKeywords = {
      happy: [
        'happy', 'glad', 'delighted', 'joyful', 'pleased', 'exciting', 'cheerful',
        'content', 'thrilled', 'excellent', 'wonderful', 'amazing', 'fantastic',
        'great', 'good', 'positive', 'love', 'enjoy', 'awesome', 'congratulations',
        'celebrate', '😊', '😀', '😄', '😁', '🙂', '😃', '🎉', '👍', '♥'
      ],
      
      sad: [
        'sad', 'unhappy', 'upset', 'disappointed', 'sorry', 'regret', 'depressed',
        'unfortunate', 'tragic', 'heartbroken', 'miserable', 'terrible', 'awful',
        'worried', 'bad', 'negative', 'fail', 'failed', 'failure', 'lost', 'lose',
        'worst', 'impossible', 'horrible', 'crying', '😢', '😭', '😔', '😞', '😥', '💔'
      ],
      
      angry: [
        'angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', 'hate', 
        'dislike', 'upset', 'outraged', 'aggressive', 'hostile', 'disgusted',
        'unacceptable', 'inexcusable', 'wrong', 'unfair', 'offensive', 'rude',
        '😠', '😡', '👿', '😤', '💢'
      ],
      
      surprised: [
        'surprised', 'shocked', 'astonished', 'amazed', 'wow', 'whoa', 'unexpected',
        'unbelievable', 'incredible', 'startled', 'stunned', 'remarkable', 'extraordinary',
        'impressive', 'shocking', 'stunning', '😮', '😲', '😯', '😱', '😳', '🤯'
      ],

      confused: [
        'confused', 'puzzled', 'uncertain', 'unsure', 'perplexed', 'complex', 'complicated',
        'doubt', 'wondering', 'unclear', 'ambiguous', 'difficult', 'strange', 'odd',
        'weird', 'confusing', 'lost', 'disoriented', 'misunderstand', 'misunderstood',
        '🤔', '😕', '❓', '❔', '🤷'
      ]
    };
    
    // Sentiment-modifying phrases
    this.modifiers = {
      negation: ['not', 'no', 'never', 'neither', 'nor', 'none', 'doesn\'t', 'don\'t',
                 'didn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t', 'hasn\'t', 
                 'haven\'t', 'hadn\'t', 'won\'t', 'wouldn\'t', 'can\'t', 'cannot',
                 'couldn\'t', 'shouldn\'t'],
      intensifiers: ['very', 'really', 'extremely', 'absolutely', 'completely', 'totally',
                     'utterly', 'highly', 'greatly', 'entirely', 'thoroughly', 'deeply',
                     'immensely', 'incredibly', 'remarkably', 'so', 'quite', 'too']
    };
  }
  
  // Analyze text to determine predominant emotion
  analyze(text) {
    if (!text || typeof text !== 'string') {
      return {
        emotion: 'neutral',
        confidence: 0
      };
    }
    
    // Lowercase the text for comparison
    const lowerText = text.toLowerCase();
    
    // Tokenize the text into words
    const words = lowerText.split(/\\s+|[.,!?;()\\[\\]{}'"]/g).filter(word => word.length > 0);
    
    // Initialize emotion scores
    const scores = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      confused: 0
    };
    
    // Track if we're in a negation context
    let negationActive = false;
    let intensifierActive = false;
    
    // Analyze each word and update scores
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if this is a negation word
      if (this.modifiers.negation.includes(word)) {
        negationActive = true;
        continue;
      }
      
      // Check if this is an intensifier
      if (this.modifiers.intensifiers.includes(word)) {
        intensifierActive = true;
        continue;
      }
      
      // Check each emotion category
      for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
        if (keywords.includes(word)) {
          // Base score is 1.0
          let score = 1.0;
          
          // Apply modifications based on context
          if (negationActive) {
            // Flip to the opposite emotion or reduce the score
            score = -1.0; 
          }
          
          if (intensifierActive) {
            // Intensify the score (positive or negative)
            score *= 1.5;
          }
          
          // Update the emotion score
          scores[emotion] += score;
        }
      }
      
      // Reset modifiers after a few words or at punctuation
      if (negationActive && (i > 0 && i % 4 === 0)) {
        negationActive = false;
      }
      
      if (intensifierActive) {
        // Intensifiers usually only affect the next word
        intensifierActive = false;
      }
    }
    
    // Find the emotion with the highest score
    let maxEmotion = 'neutral';
    let maxScore = 0.2; // Threshold for neutrality
    
    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxEmotion = emotion;
        maxScore = score;
      }
    }
    
    // Some basic normalization to get confidence between 0-1
    const confidence = Math.min(maxScore / 3, 1);
    
    return {
      emotion: maxEmotion,
      confidence: confidence,
      scores: scores
    };
  }
  
  // Simple method to extract keywords from a text for additional context
  extractKeywords(text, limit = 5) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // Lowercase and tokenize
    const words = text.toLowerCase()
      .split(/\\s+|[.,!?;()\\[\\]{}'"]/g)
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !this.isStopWord(word)); // Filter out stop words
    
    // Count word frequencies
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    // Convert to array and sort by frequency
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
    
    return sortedWords;
  }
  
  // Check if a word is a common stop word (low information value)
  isStopWord(word) {
    const stopWords = ['the', 'and', 'but', 'for', 'nor', 'yet', 'or', 'so', 'if', 
                       'this', 'that', 'these', 'those', 'with', 'from', 'about',
                       'into', 'through', 'during', 'before', 'after', 'above',
                       'below', 'down', 'upon', 'under', 'your', 'what', 'which', 
                       'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
                       'have', 'been', 'being', 'make', 'made', 'come', 'came',
                       'does', 'some', 'such', 'than', 'then', 'they', 'them'];
    
    return stopWords.includes(word);
  }
}

// Export the SentimentAnalyzer class
module.exports = SentimentAnalyzer;