/**
 * PREDICTION ENGINES
 * 
 * Rule-based prediction logic for AI features.
 * 
 * DESIGN PRINCIPLE:
 * - Each engine follows a common interface: predict(features) -> prediction
 * - Engines are swappable - can be replaced with ML models later
 * - Each engine returns both prediction and explanation (for transparency)
 * 
 * FUTURE ML INTEGRATION:
 * - Replace rule-based logic with trained model.predict(features)
 * - Keep the same interface and return format
 * - Add model versioning and confidence scores
 */

// ==================== MATCH RECOMMENDATION ENGINE ====================

/**
 * Rule-based match recommendation engine
 * 
 * Scoring factors:
 * - Team preference: +100 points if user has booked that team before
 * - Category match: +30 points if match category matches user preference
 * - Booking frequency: +20 points for frequent users
 * - Recency bonus: +15 points if match is soon
 * - Occupancy trend: +25 points for high-demand matches
 * - Venue preference: +10 points if venue matches user history
 */
function predictMatchRecommendation(userFeatures, matchFeatures) {
  let score = 0;
  const reasons = [];

  // 1. Team preference (highest weight)
  if (userFeatures.teamPreferences) {
    const teamAScore = userFeatures.teamPreferences[matchFeatures.teamA] || 0;
    const teamBScore = userFeatures.teamPreferences[matchFeatures.teamB] || 0;
    const maxTeamScore = Math.max(teamAScore, teamBScore);

    if (maxTeamScore > 0) {
      score += 100;
      const favoriteTeam = teamAScore >= teamBScore ? matchFeatures.teamA : matchFeatures.teamB;
      reasons.push(`You've booked ${favoriteTeam} matches ${maxTeamScore} time(s) before`);
    }
  }

  // 2. Category preference match
  if (userFeatures.categoryPreferences && matchFeatures.categoryStats) {
    const userTopCategory = Object.entries(userFeatures.categoryPreferences || {})
      .sort(([, a], [, b]) => b.occupancyRate - a.occupancyRate)[0];

    if (userTopCategory) {
      const cat = userTopCategory[0];
      if (matchFeatures.categoryStats[cat] && matchFeatures.categoryStats[cat].occupancyRate > 0.3) {
        score += 30;
        reasons.push(`High demand in your preferred ${cat.toUpperCase()} category`);
      }
    }
  }

  // 3. Booking frequency bonus
  if (userFeatures.bookingFrequency > 2) {
    score += 20;
    reasons.push('Active fan - frequent booking history');
  }

  // 4. Recency bonus (match coming soon)
  if (matchFeatures.daysUntilMatch <= 3 && matchFeatures.daysUntilMatch >= 0) {
    score += 15;
    reasons.push('Match starting soon - limited seats available');
  }

  // 5. Occupancy trend (high demand = popular)
  if (matchFeatures.occupancyRate > 0.6) {
    score += 25;
    reasons.push(`${(matchFeatures.occupancyRate * 100).toFixed(0)}% seats already booked - high demand`);
  } else if (matchFeatures.occupancyRate > 0.3) {
    score += 15;
    reasons.push('Moderate demand - good availability');
  }

  // 6. Venue preference
  if (userFeatures.venuePreferences && userFeatures.venuePreferences[matchFeatures.venue]) {
    score += 10;
    reasons.push(`You've attended events at ${matchFeatures.venue} before`);
  }

  // Determine recommendation reason (primary)
  let primaryReason = 'Trending match';
  if (reasons.length > 0) {
    primaryReason = reasons[0];
  }

  return {
    matchId: matchFeatures.matchId,
    score,
    reason: primaryReason,
    allReasons: reasons,
    factors: {
      teamPreference: score >= 100,
      categoryMatch: reasons.some(r => r.includes('category')),
      highDemand: matchFeatures.occupancyRate > 0.5,
      comingSoon: matchFeatures.daysUntilMatch <= 3,
    },
  };
}

// ==================== SMART SEAT RECOMMENDATION ENGINE ====================

/**
 * Rule-based smart seat recommendation engine
 * 
 * Scoring factors:
 * - Center proximity: +40 points for seats near center column
 * - Row preference: +20 points for front rows
 * - Category history: +15 points if matches user's category preference
 * - Price sensitivity: +15 points for value-for-money seats
 * - Group pattern: +10 points for seats near each other
 */
function predictSmartSeats(seatFeatures, userFeatures, matchFeatures) {
  if (!seatFeatures || !seatFeatures.seats || seatFeatures.seats.length === 0) {
    return [];
  }

  const scoredSeats = seatFeatures.seats.map(seat => {
    let score = 0;
    const factors = {};

    // 1. Center proximity (highest weight)
    const centerScore = 1 / (seat.distanceToCenter + 1);
    score += centerScore * 40;
    factors.centerProximity = centerScore;

    // 2. Row preference (front rows are better)
    const rowScore = 1 / (seat.distanceToFront + 1);
    score += rowScore * 20;
    factors.rowPreference = rowScore;

    // 3. Category history match
    if (userFeatures && userFeatures.categoryPreferences) {
      const catPreference = userFeatures.categoryPreferences[seat.category] || 0;
      score += catPreference * 15;
      factors.categoryMatch = catPreference;
    }

    // 4. Price sensitivity (mid-range seats are better value)
    if (matchFeatures && matchFeatures.pricing) {
      const avgPrice = (matchFeatures.pricing.vip + matchFeatures.pricing.premium + matchFeatures.pricing.general) / 3;
      const priceDiff = Math.abs(seat.price - avgPrice) / avgPrice;
      const valueScore = 1 - Math.min(priceDiff, 1);
      score += valueScore * 15;
      factors.priceValue = valueScore;
    }

    // 5. Group pattern (bonus for adjacent available seats)
    // This is a simplified check - in production, you'd check neighboring seats
    factors.groupPotential = seat.distanceToCenter <= 2 ? 0.8 : 0.3;
    score += factors.groupPotential * 10;

    return {
      ...seat,
      score,
      factors,
      explanation: generateSeatExplanation(factors),
    };
  });

  // Sort by score and return top recommendations
  return scoredSeats
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function generateSeatExplanation(factors) {
  const explanations = [];
  if (factors.centerProximity > 0.7) explanations.push('Excellent center view');
  if (factors.rowPreference > 0.5) explanations.push('Close to the pitch');
  if (factors.categoryMatch > 0.5) explanations.push('Matches your preference');
  if (factors.priceValue > 0.7) explanations.push('Great value for money');
  return explanations.join(' • ') || 'Good seat selection';
}

// ==================== DYNAMIC PRICING ENGINE ====================

/**
 * Rule-based dynamic pricing engine
 * 
 * Multiplier factors:
 * - Base demand: occupancy rate based
 * - Time decay: prices increase as match approaches
 * - Sales velocity: fast sales = higher demand
 * - Day factor: weekend matches are premium
 * - Historical trend: based on past sales patterns
 */
function predictDynamicPricing(matchFeatures, historicalFeatures) {
  let multiplier = 1.0;
  const factors = {};

  // 1. Base demand (occupancy-based)
  const occupancyRate = matchFeatures.occupancyRate || 0;
  const holdRate = matchFeatures.holdRate || 0;
  const activityMetric = occupancyRate + holdRate * 0.5;

  let demandMultiplier = 1.0;
  if (activityMetric >= 0.8) {
    demandMultiplier = 1.40;
    factors.demandLevel = 'Critical';
  } else if (activityMetric >= 0.5) {
    demandMultiplier = 1.25;
    factors.demandLevel = 'High';
  } else if (activityMetric >= 0.2) {
    demandMultiplier = 1.10;
    factors.demandLevel = 'Moderate';
  } else {
    demandMultiplier = 1.0;
    factors.demandLevel = 'Low';
  }
  multiplier *= demandMultiplier;
  factors.demandMultiplier = demandMultiplier;

  // 2. Time decay (prices increase as match approaches)
  const hoursUntilMatch = matchFeatures.hoursUntilMatch || 168;
  let timeMultiplier = 1.0;

  if (hoursUntilMatch <= 2) {
    timeMultiplier = 1.30; // Last 2 hours: +30%
    factors.urgency = 'Last minute';
  } else if (hoursUntilMatch <= 24) {
    timeMultiplier = 1.20; // Last 24 hours: +20%
    factors.urgency = 'Same day';
  } else if (hoursUntilMatch <= 72) {
    timeMultiplier = 1.10; // Last 3 days: +10%
    factors.urgency = 'This week';
  } else if (hoursUntilMatch <= 168) {
    timeMultiplier = 1.05; // Last week: +5%
    factors.urgency = 'Approaching';
  } else {
    factors.urgency = 'Early bird';
  }
  multiplier *= timeMultiplier;
  factors.timeMultiplier = timeMultiplier;

  // 3. Sales velocity factor
  if (historicalFeatures && historicalFeatures.salesVelocity > 5) {
    const velocityMultiplier = 1 + Math.min(historicalFeatures.salesVelocity / 50, 0.15);
    multiplier *= velocityMultiplier;
    factors.velocityMultiplier = velocityMultiplier;
    factors.salesVelocity = historicalFeatures.salesVelocity;
  }

  // 4. Day of week factor
  if (matchFeatures.isWeekend) {
    multiplier *= 1.08; // Weekend premium: +8%
    factors.dayFactor = 'Weekend premium';
  } else {
    factors.dayFactor = 'Weekday';
  }

  // 5. Match day surge
  if (matchFeatures.isMatchDay) {
    multiplier *= 1.15; // Match day: +15%
    factors.matchDaySurge = true;
  }

  // Calculate suggested prices
  const suggestedPricing = {
    vip: Math.round(matchFeatures.pricing.vip * multiplier),
    premium: Math.round(matchFeatures.pricing.premium * multiplier),
    general: Math.round(matchFeatures.pricing.general * multiplier),
  };

  return {
    matchId: matchFeatures.matchId,
    currentPricing: matchFeatures.pricing,
    suggestedPricing,
    multiplier: Math.round(multiplier * 100) / 100,
    factors,
    demandLevel: factors.demandLevel,
    confidence: calculatePricingConfidence(factors),
  };
}

function calculatePricingConfidence(factors) {
  let confidence = 0.7; // Base confidence for rule-based

  // Increase confidence with more data points
  if (factors.demandLevel === 'Critical' || factors.demandLevel === 'High') {
    confidence += 0.1;
  }
  if (factors.urgency === 'Last minute' || factors.urgency === 'Same day') {
    confidence += 0.1;
  }
  if (factors.salesVelocity > 10) {
    confidence += 0.05;
  }

  return Math.min(confidence, 0.95); // Cap at 95%
}

// ==================== FRAUD DETECTION ENGINE ====================

/**
 * Rule-based fraud detection engine
 * 
 * Risk factors:
 * - Duplicate scan: 100% risk
 * - Invalid ticket: 100% risk
 * - Rapid scanning: +30% risk
 * - Unusual pattern: +30% risk
 * - Time anomaly: +20% risk
 */
function predictFraud(fraudFeatures) {
  let riskScore = 0;
  const flags = [];
  let classification = 'safe';

  // Invalid ticket - immediate high risk
  if (!fraudFeatures.isValid) {
    return {
      riskScore: 1.0,
      classification: 'fraud',
      reason: 'invalid_ticket',
      flags: ['Non-existent ticket code'],
      action: 'block',
    };
  }

  // Duplicate scan - immediate high risk
  if (fraudFeatures.alreadyScanned) {
    return {
      riskScore: 1.0,
      classification: 'fraud',
      reason: 'duplicate_scan',
      flags: [`Ticket already scanned at ${fraudFeatures.lastScanTime}`],
      action: 'block',
      timeSinceLastScan: fraudFeatures.timeSinceLastScan,
    };
  }

  // Behavioral analysis
  if (fraudFeatures.isRapidScanning) {
    riskScore += 0.3;
    flags.push(`Rapid scanning: ${fraudFeatures.scanFrequency} scans/hour`);
  }

  if (fraudFeatures.isUnusualPattern) {
    riskScore += 0.3;
    flags.push('Unusual scan timing pattern detected');
  }

  // Time between scans anomaly
  if (fraudFeatures.avgTimeBetweenScans < 3 && fraudFeatures.recentScanCount > 3) {
    riskScore += 0.2;
    flags.push('Suspiciously fast scan intervals');
  }

  // Determine classification
  if (riskScore >= 0.7) {
    classification = 'high_risk';
  } else if (riskScore >= 0.4) {
    classification = 'medium_risk';
  } else if (riskScore >= 0.2) {
    classification = 'low_risk';
  } else {
    classification = 'safe';
  }

  // Determine action
  let action = 'allow';
  if (riskScore >= 0.7) {
    action = 'block';
  } else if (riskScore >= 0.4) {
    action = 'flag'; // Allow but flag for review
  } else if (riskScore >= 0.2) {
    action = 'monitor'; // Allow but monitor
  }

  return {
    ticketCode: fraudFeatures.ticketCode,
    riskScore: Math.round(riskScore * 100) / 100,
    classification,
    reason: flags.length > 0 ? 'behavioral_anomaly' : null,
    flags,
    action,
    scanFrequency: fraudFeatures.scanFrequency,
    avgTimeBetweenScans: fraudFeatures.avgTimeBetweenScans,
  };
}

module.exports = {
  predictMatchRecommendation,
  predictSmartSeats,
  predictDynamicPricing,
  predictFraud,
};
