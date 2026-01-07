import moment from 'moment-timezone';

interface Connection {
  city: string;
  duration: string;
}

interface FlightSegment {
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
}

interface Trip {
  id: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate?: string;
  arriveTime?: string;
  hasConnections: boolean;
  segments?: FlightSegment[];
  connections: Connection[];
}

interface Card {
  id: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  why: string;
  how: string;
  dateTime?: string;
  isInfo?: boolean;
  isDailyRoutine?: boolean;
}

interface Phase {
  name: string;
  dateRange: string;
  cards: Card[];
  durationDays?: number;
}

interface TripPlan {
  tripId: string;
  from: string;
  to: string;
  departDate: string;
  phases: {
    prepare: Phase;
    travel: Phase;
    adjust: Phase;
  };
}

interface UserSettings {
  normalBedtime: string;
  normalWakeTime: string;
  // chronotype: 'early' | 'neither' | 'night';
  useMelatonin: boolean;
  useMagnesium: boolean;
}

const cityTimezones: { [key: string]: string } = {
  'San Diego': 'America/Los_Angeles',
  'Los Angeles': 'America/Los_Angeles',
  'San Francisco': 'America/Los_Angeles',
  'Las Vegas': 'America/Los_Angeles',
  'Seattle': 'America/Los_Angeles',
  'Phoenix': 'America/Phoenix',
  'Denver': 'America/Denver',
  'Chicago': 'America/Chicago',
  'Dallas': 'America/Chicago',
  'Houston': 'America/Chicago',
  'Austin': 'America/Chicago',
  'New York': 'America/New_York',
  'Boston': 'America/New_York',
  'Washington DC': 'America/New_York',
  'Philadelphia': 'America/New_York',
  'Atlanta': 'America/New_York',
  'Miami': 'America/New_York',
  'Honolulu': 'Pacific/Honolulu',
  'Toronto': 'America/Toronto',
  'Vancouver': 'America/Vancouver',
  'Montreal': 'America/Montreal',
  'Mexico City': 'America/Mexico_City',
  'Cancun': 'America/Cancun',
  'São Paulo': 'America/Sao_Paulo',
  'Buenos Aires': 'America/Argentina/Buenos_Aires',
  'Santiago': 'America/Santiago',
  'Bogota': 'America/Bogota',
  'Lima': 'America/Lima',
  'London': 'Europe/London',
  'Dublin': 'Europe/Dublin',
  'Lisbon': 'Europe/Lisbon',
  'Madrid': 'Europe/Madrid',
  'Barcelona': 'Europe/Madrid',
  'Paris': 'Europe/Paris',
  'Brussels': 'Europe/Brussels',
  'Amsterdam': 'Europe/Amsterdam',
  'Berlin': 'Europe/Berlin',
  'Frankfurt': 'Europe/Berlin',
  'Munich': 'Europe/Berlin',
  'Rome': 'Europe/Rome',
  'Vienna': 'Europe/Vienna',
  'Zurich': 'Europe/Zurich',
  'Stockholm': 'Europe/Stockholm',
  'Copenhagen': 'Europe/Copenhagen',
  'Oslo': 'Europe/Oslo',
  'Prague': 'Europe/Prague',
  'Warsaw': 'Europe/Warsaw',
  'Istanbul': 'Europe/Istanbul',
  'Athens': 'Europe/Athens',
  'Moscow': 'Europe/Moscow',
  'Cairo': 'Africa/Cairo',
  'Johannesburg': 'Africa/Johannesburg',
  'Cape Town': 'Africa/Johannesburg',
  'Marrakech': 'Africa/Casablanca',
  'Casablanca': 'Africa/Casablanca',
  'Dubai': 'Asia/Dubai',
  'Abu Dhabi': 'Asia/Dubai',
  'Doha': 'Asia/Qatar',
  'Riyadh': 'Asia/Riyadh',
  'Tel Aviv': 'Asia/Jerusalem',
  'Delhi': 'Asia/Kolkata',
  'Mumbai': 'Asia/Kolkata',
  'Bangalore': 'Asia/Kolkata',
  'Bangkok': 'Asia/Bangkok',
  'Singapore': 'Asia/Singapore',
  'Kuala Lumpur': 'Asia/Kuala_Lumpur',
  'Jakarta': 'Asia/Jakarta',
  'Manila': 'Asia/Manila',
  'Ho Chi Minh City': 'Asia/Ho_Chi_Minh',
  'Auckland': 'Pacific/Auckland',
  'Sydney': 'Australia/Sydney',
  'Melbourne': 'Australia/Melbourne',
  'Brisbane': 'Australia/Brisbane',
  'Perth': 'Australia/Perth',
  'Tokyo': 'Asia/Tokyo',
  'Osaka': 'Asia/Tokyo',
  'Seoul': 'Asia/Seoul',
  'Beijing': 'Asia/Shanghai',
  'Shanghai': 'Asia/Shanghai',
  'Hong Kong': 'Asia/Hong_Kong',
  'Taipei': 'Asia/Taipei',
  'Puerto Natales': 'America/Punta_Arenas',
};

function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) {
    return time24;
  }
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return time24;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatTimeRange12Hour(start: string, end: string): string {
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
}

function getCityTimezone(city: string): string {
  return cityTimezones[city] || 'UTC';
}

function calculateTimezoneDiff(from: string, to: string, date: string): number {
  const fromTz = getCityTimezone(from);
  const toTz = getCityTimezone(to);

  if (fromTz === 'UTC' && !cityTimezones[from]) {
    console.warn(`City not found in timezone database: ${from}`);
    return 0;
  }
  if (toTz === 'UTC' && !cityTimezones[to]) {
    console.warn(`City not found in timezone database: ${to}`);
    return 0;
  }

  const dateInFrom = moment.tz(date, fromTz);
  const dateInTo = moment.tz(date, toTz);

  const offsetFrom = dateInFrom.utcOffset();
  const offsetTo = dateInTo.utcOffset();

  return (offsetTo - offsetFrom) / 60;
}

function getDirection(tzDiff: number): 'east' | 'west' {
  return tzDiff > 0 ? 'east' : 'west';
}

function parseLayoverDuration(duration: string): number {
  const match = duration.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

function calculateStayDuration(trip: Trip, nextTrip?: Trip): number {
  if (!nextTrip) return 999;

  const departDate = moment(trip.departDate);
  const nextDepartDate = moment(nextTrip.departDate);

  return nextDepartDate.diff(departDate, 'days');
}

function determineAdjustmentStrategy(
  trip: Trip,
  nextTrip: Trip | undefined,
  hoursDiff: number
): { percentage: number; reason: string } {
  const stayDuration = calculateStayDuration(trip, nextTrip);

  if (hoursDiff < 3) {
    return { percentage: 50, reason: 'Small timezone difference - minimal adjustment needed' };
  }

  if (stayDuration < 4) {
    return {
      percentage: 60,
      reason: `Short ${stayDuration}-day stay - partial adjustment to reduce jet lag on both ends`
    };
  }

  if (stayDuration >= 4 && stayDuration < 7 && nextTrip) {
    return {
      percentage: 80,
      reason: `${stayDuration}-day stay with ${nextTrip.to} trip coming - strong but flexible adjustment`
    };
  }

  return { percentage: 100, reason: 'Full adjustment to destination timezone' };
}

function adjustTimeForChronotype(
  baseTime: string,
  chronotype: string,
  direction: 'earlier' | 'later'
): string {
  const [hours, minutes] = baseTime.split(':').map(Number);
  let adjustedHours = hours;

  if (chronotype === 'early' && direction === 'earlier') {
    adjustedHours = Math.max(6, hours - 1);
  } else if (chronotype === 'night' && direction === 'earlier') {
    adjustedHours = Math.min(23, hours + 1);
  } else if (chronotype === 'night' && direction === 'later') {
    adjustedHours = Math.min(1, hours + 1);
  }

  return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function generateJetLagPlan(
  trip: Trip,
  allTrips: Trip[],
  userSettings: UserSettings
): TripPlan {
  const tzDiff = calculateTimezoneDiff(trip.from, trip.to, trip.departDate);
  const direction = getDirection(tzDiff);
  const hoursDiff = Math.abs(tzDiff);

  const currentIndex = allTrips.findIndex(t => t.id === trip.id);
  const nextTrip = currentIndex >= 0 && currentIndex < allTrips.length - 1
    ? allTrips[currentIndex + 1]
    : undefined;

  const adjustmentStrategy = determineAdjustmentStrategy(trip, nextTrip, hoursDiff);

  const departMoment = moment(trip.departDate);
  const prepDays = hoursDiff >= 4 ? 2 : 1;
  const prepareStartDate = departMoment.clone().subtract(prepDays, 'days').format('YYYY-MM-DD');
  const prepareEndDate = departMoment.clone().subtract(1, 'days').format('YYYY-MM-DD');
  const adjustEndDate = departMoment.clone().add(3, 'days').format('YYYY-MM-DD');

  // Calculate actual arrival date for adjust phase
  const lastSegment = trip.segments && trip.segments.length > 0
    ? trip.segments[trip.segments.length - 1]
    : null;

  const adjustStartDate = lastSegment && lastSegment.arriveDate
    ? lastSegment.arriveDate
    : departMoment.clone().add(1, 'days').format('YYYY-MM-DD');

  const adjustEndDateCalculated = moment(adjustStartDate).add(1, 'days').format('YYYY-MM-DD');

  const prepareCards = generatePrepareCards(
    trip,
    direction,
    hoursDiff,
    userSettings,
    prepareStartDate,
    prepDays
  );

  const travelCards = generateTravelCards(
    trip,
    direction,
    hoursDiff,
    userSettings
  );

  const adjustmentDuration = Math.max(1, Math.ceil(hoursDiff / 1.5));

  const adjustCards = generateAdjustCards(
    trip,
    direction,
    hoursDiff,
    adjustmentStrategy,
    userSettings,
    nextTrip,
    adjustStartDate
  );


  return {
    tripId: trip.id,
    from: trip.from,
    to: trip.to,
    departDate: trip.departDate,
    phases: {
      prepare: {
        name: 'Prepare',
        dateRange: formatDateRange(prepareStartDate, prepareEndDate),
        cards: prepareCards,
      },
      travel: {
        name: 'Travel Day',
        dateRange: formatDateRange(
          trip.departDate,
          lastSegment && lastSegment.arriveDate ? lastSegment.arriveDate : trip.departDate
        ),
        cards: travelCards,
      },
      adjust: {
        name: 'Adjust',
        dateRange: formatDateRange(
          adjustStartDate,
          adjustEndDateCalculated
        ),
        cards: adjustCards,
        durationDays: adjustmentDuration,
      },
    },
  };
}

function generatePrepareCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  userSettings: UserSettings,
  startDate: string,
  prepDays: number
): Card[] {
  const cards: Card[] = [];

  if (hoursDiff < 3) {
    cards.push({
      id: 'prep-rest',
      title: 'Get Good Rest',
      time: 'Evening',
      icon: '😴',
      color: '#6366f1',
      why: `Only ${hoursDiff} hour difference - your body will adjust naturally. Focus on being well-rested.`,
      how: 'Maintain your normal sleep schedule. Pack and prepare without stress.',
      dateTime: `${startDate}T20:00:00`,
    });

    // FIX #5: Add more cards for short trips
    cards.push({
      id: 'prep-hydrate',
      title: 'Stay Hydrated',
      time: 'Throughout the day',
      icon: '💧',
      color: '#3b82f6',
      why: 'Travel dehydrates you regardless of timezone change. Start hydrating well now.',
      how: 'Drink extra water today and tomorrow. Aim for 8-10 glasses per day.',
      dateTime: `${startDate}T09:00:00`,
    });

    cards.push({
      id: 'prep-activity',
      title: 'Light Exercise',
      time: 'Morning or afternoon',
      icon: '🚶',
      color: '#10b981',
      why: 'Physical activity helps you sleep better and reduces travel stress.',
      how: 'Take a 30-minute walk or do light exercise. Nothing too intense before travel.',
      dateTime: `${startDate}T10:00:00`,
    });

    cards.sort((a, b) => {
      if (!a.dateTime || !b.dateTime) return 0;
      return moment(a.dateTime).diff(moment(b.dateTime));
    });

    return cards.sort((a, b) => {
      if (!a.dateTime || !b.dateTime) return 0;
      const momentA = moment(a.dateTime);
      const momentB = moment(b.dateTime);
      return momentA.isBefore(momentB) ? -1 : 1;
    });

  }

  if (direction === 'east') {
    const lightTime = formatTimeRange12Hour('07:00', '09:00');


    cards.push({
      id: 'prep-light',
      title: 'Seek Morning Light',
      time: lightTime,
      icon: '☀️',
      color: '#fbbf24',
      why: `Traveling ${hoursDiff} hours east to ${trip.to}. Morning light advances your body clock.`,
      how: 'Get bright light exposure within 2 hours of waking. Go outside for 30-60 minutes, or use a light therapy lamp.',
      dateTime: `${startDate}T07:00:00`,
    });

    // Calculate 30 minutes earlier than normal bedtime
    const normalBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
    const earlierBedtime = normalBedtimeMoment.subtract(30, 'minutes').format('HH:mm');

    cards.push({
      id: 'prep-sleep',
      title: 'Sleep Earlier',
      time: formatTime12Hour(earlierBedtime),
      icon: '🌙',
      color: '#6366f1',
      why: `Shift your sleep 30 minutes earlier than your normal ${formatTime12Hour(userSettings.normalBedtime)} bedtime for ${prepDays} days before departure.`,
      how: 'Go to bed 30-60 minutes earlier than usual. Dim lights after 8 PM. Avoid screens before bed.',
      dateTime: `${startDate}T${earlierBedtime}:00`,
    });

    cards.push({
      id: 'prep-avoid-evening-light',
      title: 'Avoid Bright Light',
      time: '8:00 PM onwards',
      icon: '🌙',
      color: '#64748b',
      why: 'Evening light will delay your clock - opposite of what you need for eastward travel.',
      how: 'Dim lights in your home. Use warm/amber lighting. Wear blue-light blocking glasses if needed.',
      dateTime: `${startDate}T20:00:00`,
    });

  } else {
    const lightTime = '6:00 - 8:00 PM';

    cards.push({
      id: 'prep-light',
      title: 'Seek Evening Light',
      time: lightTime,
      icon: '🌅',
      color: '#f97316',
      why: `Traveling ${hoursDiff} hours west to ${trip.to}. Evening light delays your body clock.`,

      how: 'Get bright light exposure in the evening. Go outside or use bright indoor lighting.',
      dateTime: `${startDate}T18:00:00`,
    });

    // Calculate 30 minutes later than normal bedtime
    const normalBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
    const laterBedtime = normalBedtimeMoment.add(30, 'minutes').format('HH:mm');

    cards.push({
      id: 'prep-sleep',
      title: 'Sleep Later',
      time: formatTime12Hour(laterBedtime),
      icon: '🌙',
      color: '#6366f1',
      why: `Shift your sleep 30 minutes later than your normal ${formatTime12Hour(userSettings.normalBedtime)} bedtime to match destination timezone.`,
      how: 'Stay up 30-60 minutes later than usual. Keep lights bright in the evening.',
      dateTime: `${startDate}T${laterBedtime}:00`,
    });
  }

  return cards;
}

function generateTravelCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  userSettings: UserSettings
): Card[] {
  const cards: Card[] = [];

  // Use segments if available
  const segments = trip.segments && trip.segments.length > 0
    ? trip.segments
    : [{
      from: trip.from,
      to: trip.to,
      departDate: trip.departDate,
      departTime: trip.departTime,
      arriveDate: trip.arriveDate || trip.departDate,
      arriveTime: trip.arriveTime || '23:59',
    }];

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  // Calculate total journey time
  const journeyStart = moment.tz(
    `${firstSegment.departDate} ${firstSegment.departTime}`,
    'YYYY-MM-DD HH:mm',
    getCityTimezone(firstSegment.from)
  );

  const journeyEnd = moment.tz(
    `${lastSegment.arriveDate} ${lastSegment.arriveTime}`,
    'YYYY-MM-DD HH:mm',
    getCityTimezone(lastSegment.to)
  );

  const totalHours = journeyEnd.diff(journeyStart, 'hours', true);

  // Determine destination sleep window (10 PM - 6 AM destination time)
  const destTz = getCityTimezone(trip.to);

  // === FIRST: Add the "Your Flight" overview card ===
  const routeString = segments.length > 1
    ? `${trip.from} → ${segments.map(s => s.to).join(' → ')}`
    : `${trip.from} → ${trip.to}`;

  cards.push({
    id: 'travel-flight-overview',
    title: 'Your Flight',
    time: routeString,
    icon: '✈️',
    color: '#DBEAFE',
    why: `Departs ${formatTime12Hour(firstSegment.departTime)}`,
    how: `Total journey: ~${Math.round(totalHours)} hours with ${segments.length} flight segment${segments.length > 1 ? 's' : ''}`,
    isInfo: true,
  });

  // === Analyze each segment for sleep/wake recommendations ===
  interface SegmentAnalysis {
    segment: FlightSegment;
    departMoment: moment.Moment;
    arriveMoment: moment.Moment;
    durationHours: number;
    departAtDest: moment.Moment;
    arriveAtDest: moment.Moment;
    isOvernightFlight: boolean;
    isDaytimeFlight: boolean;
    shouldSleep: boolean;
    nextLayoverHours?: number;
  }

  const segmentAnalyses: SegmentAnalysis[] = segments.map((segment, index) => {
    const departMoment = moment.tz(
      `${segment.departDate} ${segment.departTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(segment.from)
    );

    const arriveMoment = moment.tz(
      `${segment.arriveDate} ${segment.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(segment.to)
    );

    const durationHours = arriveMoment.diff(departMoment, 'hours', true);

    // Convert to destination timezone
    const departAtDest = departMoment.clone().tz(destTz);
    const arriveAtDest = arriveMoment.clone().tz(destTz);

    const departHourDest = departAtDest.hour();
    const arriveHourDest = arriveAtDest.hour();

    // Determine if this is an overnight flight at destination
    // Overnight = departs between 6 PM - 2 AM (and long enough to sleep) OR arrives morning after a long flight
    const departsEveningOrNight = departHourDest >= 18 || departHourDest < 2;
    const arrivesEarlyMorning = arriveHourDest >= 4 && arriveHourDest <= 10;
    const isLongFlight = durationHours >= 5;

    // Fix: Only count "arriving early morning" as overnight if it was a LONG flight (6+ hours).
    // Short morning hops (e.g. 7 AM -> 9 AM) are just morning flights.
    const isOvernightFlight = (departsEveningOrNight && durationHours >= 3) || (arrivesEarlyMorning && durationHours >= 6);
    const isDaytimeFlight = !isOvernightFlight;

    // Should sleep if: overnight flight AND long enough to sleep (3+ hours)
    const shouldSleep = isOvernightFlight && durationHours >= 3;

    // Calculate layover time to next flight
    let nextLayoverHours: number | undefined;
    if (index < segments.length - 1) {
      const nextSegment = segments[index + 1];
      const nextDepartMoment = moment.tz(
        `${nextSegment.departDate} ${nextSegment.departTime}`,
        'YYYY-MM-DD HH:mm',
        getCityTimezone(nextSegment.from)
      );
      nextLayoverHours = nextDepartMoment.diff(arriveMoment, 'hours', true);
    }

    return {
      segment,
      departMoment,
      arriveMoment,
      durationHours,
      departAtDest,
      arriveAtDest,
      isOvernightFlight,
      isDaytimeFlight,
      shouldSleep,
      nextLayoverHours,
    };
  });

  // === Build cards chronologically by day ===
  // === Build cards chronologically by day ===
  let currentDate = journeyStart.clone().startOf('day');
  const endDate = journeyEnd.clone().endOf('day');

  console.log('=== Day Loop Debug ===');
  console.log('Journey start:', journeyStart.format('YYYY-MM-DD HH:mm'));
  console.log('Journey end:', journeyEnd.format('YYYY-MM-DD HH:mm'));
  console.log('Loop will run from:', currentDate.format('YYYY-MM-DD'), 'to:', endDate.format('YYYY-MM-DD'));

  while (currentDate.isSameOrBefore(endDate, 'day')) {
    const dateStr = currentDate.format('MMM D');
    const dateYYYYMMDD = currentDate.format('YYYY-MM-DD');

    console.log('\n--- Processing date:', dateYYYYMMDD, '---');

    // Find segments that DEPART on this date
    const segmentsDepartingToday = segmentAnalyses.filter(analysis => {
      const segDepartDate = analysis.departMoment.format('YYYY-MM-DD');
      console.log(`  Segment ${analysis.segment.from}→${analysis.segment.to} departs on ${segDepartDate}`);
      return segDepartDate === dateYYYYMMDD;
    });

    console.log(`Date ${dateYYYYMMDD}: Found ${segmentsDepartingToday.length} segments:`,
      segmentsDepartingToday.map(a => `${a.segment.from}→${a.segment.to}`).join(', '));

    if (segmentsDepartingToday.length > 0) {
      const isFirstDay = currentDate.isSame(journeyStart, 'day');
      const isLastDay = currentDate.isSame(journeyEnd, 'day');

      let headerText = '';
      if (isFirstDay) {
        headerText = `${dateStr} - Departure Day - ${trip.from} Time`;
      } else if (isLastDay) {
        headerText = `${dateStr} - Arrival Day - ${trip.to} Time`;
      } else {
        const firstSegToday = segmentsDepartingToday[0];
        headerText = `${dateStr} - In Flight - ${firstSegToday.segment.from} Time`;
      }

      // Add navy header bar
      cards.push({
        id: `header-${dateYYYYMMDD}`,
        title: headerText,
        time: '',
        icon: '',
        color: '#1E3A5F',
        why: '',
        how: '',
        isInfo: true,
      });

      // FIX #3: Add per-day caffeine guidance
      const hasOvernightFlightToday = segmentsDepartingToday.some(a => a.shouldSleep);

      // Check if next day has overnight flight
      const nextDate = currentDate.clone().add(1, 'day').format('YYYY-MM-DD');
      const segmentsDepartingTomorrow = segmentAnalyses.filter(a =>
        a.departMoment.format('YYYY-MM-DD') === nextDate
      );
      const hasOvernightFlightTomorrow = segmentsDepartingTomorrow.some(a => a.shouldSleep);

      if (hasOvernightFlightToday) {
        const overnightFlight = segmentsDepartingToday.find(a => a.shouldSleep);
        if (overnightFlight) {
          // Calculate caffeine cutoff: 6 hours before user's normal bedtime OR 4 hours before flight, whichever is earlier
          const userBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
          const caffeineCutoffFromBedtime = userBedtimeMoment.clone().subtract(6, 'hours');
          const caffeineCutoffFromFlight = overnightFlight.departMoment.clone().subtract(4, 'hours');

          // Use the earlier of the two times
          const caffeineStopTime = moment.min(caffeineCutoffFromBedtime, caffeineCutoffFromFlight);

          cards.push({
            id: `caffeine-cutoff-${dateYYYYMMDD}`,
            title: 'Caffeine Cutoff',
            time: `Stop by ${caffeineStopTime.format('h:mm A')} ${firstSegment.from} time`,
            icon: '🚫',
            color: '#F3F0ED',
            why: `You have an overnight flight at ${overnightFlight.departMoment.format('h:mm A')}. Stop caffeine early to ensure you can sleep.`,
            how: `Switch to water, herbal tea, or juice. This helps you sleep on your overnight flight.`,
            dateTime: caffeineStopTime.toISOString(),
          });
        }
      } else if (hasOvernightFlightTomorrow) {

        const firstFlightToday = segmentsDepartingToday[0];

        cards.push({
          id: `caffeine-limit-${dateYYYYMMDD}`,
          title: 'Limit Caffeine Today',
          time: 'Only before 2 PM',
          icon: '☕',
          color: '#B46B49',
          why: `You have an overnight flight tomorrow. Keep caffeine intake early today.`,
          how: `Coffee or tea is fine until 2 PM. After that, switch to water or herbal tea.`,
        });
      } else {
        const flightWord = segments.length > 1 ? 'flights' : 'flight';
        const layoverText = segments.length > 1 ? ' and layovers' : '';
        const firstFlightToday = segmentsDepartingToday[0];

        cards.push({
          id: `caffeine-ok-${dateYYYYMMDD}`,
          title: 'Caffeine OK',
          time: `Throughout your ${flightWord}`,
          icon: '☕',
          color: '#B46B49',
          why: `Your ${flightWord} today ${segments.length > 1 ? 'are' : 'is'} all during daytime at destination. Caffeine can help you stay alert.`,
          how: `Coffee or tea is fine during ${flightWord}${layoverText}. Stay hydrated too.`,
          dateTime: firstFlightToday.departMoment.clone().subtract(10, 'minutes').toISOString(),
        });
      }

      // === Add flight segment cards for each flight departing today ===
      segmentsDepartingToday.forEach((analysis) => {
        const segment = analysis.segment;

        cards.push({
          id: `flight-segment-${segment.from}-${segment.to}-${segment.departTime}`,
          title: `Flight from ${segment.from} to ${segment.to}`,
          time: `${moment(segment.departDate).format('MMM D')} ${formatTime12Hour(segment.departTime)} → ${moment(segment.arriveDate).format('MMM D')} ${formatTime12Hour(segment.arriveTime)}`,
          icon: '',
          color: '#2C5F7C',
          why: `${segment.from} → ${segment.to}`,
          how: `Departs ${moment(segment.departDate).format('MMM D')} at ${formatTime12Hour(segment.departTime)}, arrives ${moment(segment.arriveDate).format('MMM D')} at ${formatTime12Hour(segment.arriveTime)}`,
          isInfo: true,
        });

        // === Add sleep/wake recommendation for THIS specific flight ===
        if (analysis.shouldSleep) {
          cards.push({
            id: `sleep-${segment.from}-${segment.to}`,
            title: `Sleep on ${segment.from}→${segment.to} Flight`,
            time: `${formatTime12Hour(segment.departTime)} - ${formatTime12Hour(segment.arriveTime)}`,
            icon: '😴',
            color: '#1C5D74',
            why: `This ${Math.round(analysis.durationHours)}-hour flight overlaps with nighttime at your destination (${trip.to}). Sleep now to align with destination timezone.`,
            how: `Use eye mask, earplugs, neck pillow. Try to sleep ${Math.min(Math.round(analysis.durationHours) - 1, 6)} hours. Decline meals if they interrupt sleep.`,
            dateTime: analysis.departMoment.clone().subtract(5, 'minutes').toISOString(),

          });
        } else if (analysis.isDaytimeFlight && analysis.durationHours >= 2) {
          cards.push({
            id: `awake-${segment.from}-${segment.to}`,
            title: `Stay Awake on ${segment.from}→${segment.to} Flight`,
            time: `${formatTime12Hour(segment.departTime)} - ${formatTime12Hour(segment.arriveTime)}`,
            icon: '👁️',
            color: '#F3F0ED',
            why: `This flight is during daytime at your destination. Stay awake to stay aligned with ${trip.to} timezone.`,
            how: `Watch movies, read, work. Accept meals. Walk around cabin. Stay engaged and alert.`,
            dateTime: analysis.departMoment.clone().subtract(5, 'minutes').toISOString(),
          });
        }

        // === Add layover guidance if there's a connection ===
        if (analysis.nextLayoverHours !== undefined) {
          const layoverHours = analysis.nextLayoverHours;
          const nextSegment = segments[segments.indexOf(segment) + 1];

          if (layoverHours >= 0.5 && layoverHours < 2) {
            // Short layover - just transit
            cards.push({
              id: `layover-${segment.to}-short`,
              title: `${segment.to} Layover`,
              time: `${Math.round(layoverHours * 60)} min connection`,
              icon: '🚶',
              color: '#F3F0ED',
              why: `Quick connection in ${segment.to}. Focus on making your next flight.`,
              how: `Head directly to next gate. Use restroom. Refill water. No time for meals or exploring.`,
            });
          } else if (layoverHours >= 2 && layoverHours < 5) {
            // Medium layover - opportunity to adjust
            const layoverArriveHour = analysis.arriveMoment.hour();
            const isNightArrival = layoverArriveHour >= 22 || layoverArriveHour < 6;

            if (isNightArrival && layoverHours >= 3) {
              cards.push({
                id: `layover-${segment.to}-rest`,
                title: `${segment.to} Layover - Rest`,
                time: `${Math.round(layoverHours)} hour layover`,
                icon: '💤',
                color: '#F3F0ED',
                why: `${Math.round(layoverHours)}-hour overnight layover. This is a chance to rest before your next flight.`,
                how: `Find a quiet area. Set alarm for 90 min before next flight. Short nap OK but don't miss your flight!`,
              });
            } else {
              // Check if next flight is overnight - if so, avoid caffeine
              const nextAnalysis = segmentAnalyses.find(a => a.segment === nextSegment);
              const nextIsOvernight = nextAnalysis?.shouldSleep;

              cards.push({
                id: `layover-${segment.to}-active`,
                title: `${segment.to} Layover - Stay Active`,
                time: `${Math.round(layoverHours)} hour layover`,
                icon: '🚶',
                color: '#F3F0ED',
                why: `${Math.round(layoverHours)}-hour layover during daytime. Stay active and alert.`,
                how: nextIsOvernight
                  ? `Walk around terminal. Eat a light meal. Stretch. NO caffeine - you have an overnight flight next.`
                  : `Walk around terminal. Eat a light meal. Caffeine OK if needed. Stay hydrated.`,
              });
            }
          } else if (layoverHours >= 5) {
            // Long layover - might leave airport
            cards.push({
              id: `layover-${segment.to}-long`,
              title: `${segment.to} Extended Layover`,
              time: `${Math.round(layoverHours)} hour layover`,
              icon: '🏨',
              color: '#F3F0ED',
              why: `${Math.round(layoverHours)}-hour layover. You have time to leave the airport if you want.`,
              how: `Consider booking airport hotel for shower/rest. Or explore city if you have visa. Set multiple alarms!`,
            });
          }
        }
      });


    }

    console.log('Moving to next day...\n');
    currentDate.add(1, 'day');
  }

  console.log('=== Day Loop Complete ===\n');

  // === Add overall hydration card ===
  cards.push({
    id: 'travel-hydrate',
    title: 'Stay Hydrated',
    time: segments.length > 1 ? `All flights and layovers` : `Throughout your flight`,
    icon: '💧',
    color: '#DBEAFE',
    why: segments.length > 1
      ? `Multi-leg journey with ${segments.length} flights. Airplane cabins are extremely dry. Dehydration compounds jet lag.`
      : 'Airplane cabins are extremely dry. Dehydration worsens jet lag symptoms.',
    how: segments.length > 1
      ? `Drink water regularly on planes and during layovers. Aim for 8oz per flight hour. Avoid excessive alcohol.`
      : `Drink water regularly on the plane. Aim for 8oz per flight hour. Avoid excessive alcohol.`,
  });

  return cards;
}

function generateAdjustCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  adjustmentStrategy: { percentage: number; reason: string },
  userSettings: UserSettings,
  nextTrip: Trip | undefined,
  startDate: string
): Card[] {
  const cards: Card[] = [];

  // Determine the actual landing time
  const lastSegment = trip.segments && trip.segments.length > 0
    ? trip.segments[trip.segments.length - 1]
    : null;

  const landingMoment = lastSegment
    ? moment.tz(
      `${lastSegment.arriveDate} ${lastSegment.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(lastSegment.to)
    )
    : moment(startDate).startOf('day');

  const landingHour = landingMoment.hour();
  const landingTime = landingMoment.format('h:mm A');

  // ============================================
  // ARRIVAL DAY CARDS (conditional based on landing time)
  // ============================================

  cards.push({
    id: 'adjust-arrival',
    title: 'You\'ve Arrived!',
    time: `Landed at ${landingTime}`,
    icon: '🎉',
    color: '#10b981',
    why: `You've reached ${trip.to}. Now it's time to lock in the new timezone.`,
    how: 'Get your bags, clear customs, head to your accommodation. The adjustment phase begins now.',
    dateTime: landingMoment.toISOString(),
  });

  // If land between 4 AM and 10 AM - get morning sunlight immediately
  if (landingHour >= 4 && landingHour < 10) {
    cards.push({
      id: 'adjust-arrival-morning-light',
      title: 'Seek Morning Sunlight Now',
      time: `${landingTime} - 10:00 AM`,
      icon: '☀️',
      color: '#FFF7C5',
      why: `Perfect timing! You landed during prime morning light hours. Get outside immediately.`,
      how: 'Get sunlight during your commute from airport. Even through windows helps. This jumpstarts your adjustment.',
      dateTime: landingMoment.toISOString(),
    });
  }

  // If land 10 AM - 6 PM - get afternoon sunlight
  if (landingHour >= 10 && landingHour < 18) {
    cards.push({
      id: 'adjust-arrival-afternoon-light',
      title: 'Get Afternoon Sunlight',
      time: `${landingTime} - 6:00 PM`,
      icon: '🌞',
      color: '#FFF7C5',
      why: `You landed mid-day. Get outdoor light for the rest of the afternoon to help adjustment.`,
      how: 'Stay active outdoors if possible. Walk around your neighborhood. Sit by windows. Avoid napping.',
      dateTime: landingMoment.toISOString(),
    });
  }

  // Caffeine guidance for arrival day
  // Only suggest caffeine if landing during normal morning hours (6 AM+).
  // Avoid suggesting it for middle-of-the-night arrivals (e.g. 1 AM) where sleep is priority.
  if (landingHour >= 6 && landingHour < 14) {
    cards.push({
      id: 'adjust-arrival-caffeine',
      title: 'Caffeine OK Until 2 PM',
      time: `${landingTime} - 2:00 PM`,
      icon: '☕',
      color: '#B46B49',
      why: 'Stay alert after landing, but cut off early enough to sleep tonight.',
      how: 'Coffee or tea is fine until 2 PM. Then switch to water.',
      dateTime: landingMoment.toISOString(),
    });
  }

  // No caffeine after 2 PM (always show for arrival day)
  const noCaffeineTime = landingMoment.clone().hour(14).minute(0).second(0);
  cards.push({
    id: 'adjust-arrival-no-caffeine',
    title: 'No Caffeine After 2 PM',
    time: 'After 2:00 PM',
    icon: '🚫',
    color: '#F3F0ED',
    why: 'Your first night of sleep in the new timezone is critical. No caffeine in the afternoon.',
    how: 'Switch to water, herbal tea, or juice after 2 PM.',
    dateTime: noCaffeineTime.toISOString(),
  });

  const arrivalDate = landingMoment.format('YYYY-MM-DD');


  // Evening meal and sleep guidance - conditional based on arrival time
  if (landingHour >= 22 || landingHour < 4) {
    // Very late arrival (10 PM or later) - just go to bed
    cards.push({
      id: 'adjust-arrival-sleep-now',
      title: 'Head to Bed Soon',
      time: 'As soon as you can',
      icon: '🌙',
      color: '#1C5D74',
      why: `You arrived at ${landingTime}. Get some rest tonight and start the full adjustment routine tomorrow.`,
      how: `Get to your accommodation and sleep. ${userSettings.useMelatonin ? 'Take melatonin if it helps you sleep.' : ''
        } Tomorrow you'll begin the complete adjustment schedule.`,
      dateTime: landingMoment.toISOString(),
    });
  } else if (landingHour >= 18) {
    // Evening arrival (6 PM - 10 PM) - light meal then bed
    cards.push({
      id: 'adjust-arrival-light-meal',
      title: 'Light Evening Meal',
      time: 'Soon after arrival',
      icon: '🍽️',
      color: '#F3F0ED',
      why: `Evening arrival at ${landingTime}. Have a light meal to help you settle in.`,
      how: 'Eat something light at your accommodation or nearby. Don\'t skip food, but avoid heavy meals late at night.',
      dateTime: landingMoment.toISOString(),
    });


    cards.push({
      id: 'adjust-arrival-sleep',
      title: 'Sleep at Local Bedtime',
      time: formatTime12Hour(userSettings.normalBedtime),
      icon: '🌙',
      color: '#1C5D74',
      why: 'Get to bed at a reasonable local time to start your adjustment.',
      how: `Try to sleep around ${formatTime12Hour(userSettings.normalBedtime)}. ${userSettings.useMelatonin ? 'Take melatonin 30 min before bed.' : ''
        } Keep room dark and cool.`,
      dateTime: `${arrivalDate}T${userSettings.normalBedtime}:00`,
    });
  } else {
    // Daytime arrival (before 6 PM) - normal dinner and sleep schedule
    const dinnerTime = landingMoment.clone().hour(18).minute(0).second(0);
    cards.push({
      id: 'adjust-arrival-dinner',
      title: 'Eat Dinner at Local Time',
      time: '6:00 - 8:00 PM',
      icon: '🍽️',
      color: '#F3F0ED',
      why: 'Eating at local meal times helps reset your internal clock.',
      how: 'Have dinner at a normal local dinner time, even if not hungry. Light meal is fine.',
      dateTime: dinnerTime.toISOString(),
    });

    cards.push({
      id: 'adjust-arrival-sleep',
      title: 'Sleep at Local Time Tonight',
      time: formatTime12Hour(userSettings.normalBedtime),
      icon: '🌙',
      color: '#1C5D74',
      why: 'Your first night in the new timezone. Sleep at normal local bedtime even if not tired.',
      how: `Go to bed around ${formatTime12Hour(userSettings.normalBedtime)}. Keep room dark and cool. ${userSettings.useMelatonin ? 'Take melatonin 30 min before bed.' : ''
        }`,
      dateTime: `${arrivalDate}T${userSettings.normalBedtime}:00`,
    });
  }

  // ============================================
  // VISUAL SEPARATOR - Place at end of arrival day (11:59 PM)
  // ============================================

  const separatorTime = landingMoment.clone().endOf('day');

  cards.push({
    id: 'adjust-separator',
    title: 'Daily Routine - Follow These Each Day →',
    time: '',
    icon: '',
    color: '#E5E7EB',
    why: '',
    how: '',
    isInfo: true,
    dateTime: separatorTime.toISOString(),
  });

  // ============================================
  // RECURRING DAILY CARDS (for all following days)
  // ============================================

  const nextDayMorning = landingMoment.clone().add(1, 'day').startOf('day').add(7, 'hours');
  const nextDayStr = nextDayMorning.format('YYYY-MM-DD');

  cards.push({
    id: 'adjust-morning-light-daily',
    title: 'Seek Morning Sunlight',
    time: formatTimeRange12Hour('07:00', '10:00'),
    icon: '☀️',
    color: '#FFF7C5',
    why: `Most powerful tool for locking in ${trip.to} timezone. Morning light stabilizes your internal body clock. ${adjustmentStrategy.reason}`,
    how: 'Get outside for 30-60 minutes in natural daylight. Even cloudy days work. This is your #1 priority.',
    dateTime: nextDayMorning.format('YYYY-MM-DDTHH:mm:ss'),
    isDailyRoutine: true,
  });

  cards.push({
    id: 'adjust-caffeine-ok',
    title: 'Caffeine OK',
    time: formatTimeRange12Hour('07:00', '14:00'),
    icon: '☕',
    color: '#92400e',
    why: 'Strategic caffeine helps you stay alert during local daytime. Essential for adjustment.',
    how: 'Coffee or tea during these hours. Helps fight off sleepiness and stay on local schedule.',
    dateTime: `${nextDayStr}T07:00:00`,
    isDailyRoutine: true,
  });

  cards.push({
    id: 'adjust-no-caffeine',
    title: 'No Caffeine After 2 PM',
    time: 'After 2:00 PM',
    icon: '🚫',
    color: '#64748b',
    why: 'Caffeine stays in your system 6+ hours. You need good sleep tonight to consolidate adjustment.',
    how: 'Switch to water, herbal tea, or decaf. Resist the temptation for afternoon coffee.',
    dateTime: `${nextDayStr}T14:00:00`,
    isDailyRoutine: true,
  });

  if (direction === 'east') {
    cards.push({
      id: 'adjust-avoid-naps',
      title: 'Avoid Long Naps',
      time: '12:00 - 5:00 PM',
      icon: '⏰',
      color: '#ef4444',
      why: 'Eastward travel makes you drowsy in afternoon. Long naps will prevent nighttime sleep.',
      how: 'If desperately tired, limit naps to 20 minutes max. Set an alarm. Better: take a walk outside.',
      dateTime: `${nextDayStr}T12:00:00`,
      isDailyRoutine: true,
    });
  } else {
    cards.push({
      id: 'adjust-nap-ok',
      title: 'Short Nap OK if Needed',
      time: '1:00 - 3:00 PM',
      icon: '💤',
      color: '#8b5cf6',
      why: 'Westward travel is easier. A brief nap won\'t hurt your adjustment.',
      how: 'If tired, a 20-30 minute nap is fine. Set an alarm. Don\'t nap after 3 PM.',
      dateTime: `${nextDayStr}T13:00:00`,
      isDailyRoutine: true,
    });
  }

  const localBedtime = userSettings.normalBedtime;
  cards.push({
    id: 'adjust-sleep',
    title: 'Sleep at Local Time',
    time: `${formatTime12Hour(localBedtime)} - consistent schedule`,
    icon: '🌙',
    color: '#6366f1',
    why: `Your body is learning ${trip.to} time. Consistent sleep schedule locks it in.${nextTrip ? ` ${adjustmentStrategy.reason}` : ''
      }`,
    how: `Go to bed around ${localBedtime} local time. Keep room dark and cool. ${userSettings.useMelatonin ? 'Take melatonin 30 min before bed.' : ''
      }`,
    dateTime: `${nextDayStr}T${localBedtime}:00`,
    isDailyRoutine: true,
  });

  if (userSettings.useMelatonin) {
    const melatoninTime = moment(localBedtime, 'HH:mm').subtract(30, 'minutes').format('HH:mm');
    cards.push({
      id: 'adjust-melatonin',
      title: 'Take Melatonin',
      time: `${formatTime12Hour(melatoninTime)} (30 min before bed)`,
      icon: '💊',
      color: '#8b5cf6',
      why: 'Melatonin signals to your body that it\'s time to sleep in the new timezone.',
      how: 'Consider taking a small dose 30 minutes before bed if you have used it before. Follow package instructions or consult a doctor.',
      dateTime: `${nextDayStr}T${melatoninTime}:00`,
      isDailyRoutine: true,
    });
  }

  if (userSettings.useMagnesium) {
    cards.push({
      id: 'adjust-magnesium',
      title: 'Take Magnesium',
      time: 'Evening with dinner',
      icon: '💊',
      color: '#10b981',
      why: 'Magnesium supports sleep quality and helps reduce travel-related stress.',
      how: 'Take magnesium glycinate with dinner. Helps with relaxation and sleep.',
      dateTime: `${nextDayStr}T19:00:00`,
      isDailyRoutine: true,
    });
  }

  // Sort all cards chronologically before returning
  cards.sort((a, b) => {
    // Cards with dateTime come first, sorted chronologically
    // Cards without dateTime (daily routine cards) come last, in insertion order
    if (a.dateTime && !b.dateTime) return -1;
    if (!a.dateTime && b.dateTime) return 1;
    if (!a.dateTime && !b.dateTime) return 0;
    return moment(a.dateTime).diff(moment(b.dateTime));
  });

  return cards;
}

function formatDateRange(start: string, end: string): string {
  const startMoment = moment(start, 'YYYY-MM-DD');
  const endMoment = moment(end, 'YYYY-MM-DD');

  if (!startMoment.isValid() || !endMoment.isValid()) {
    return 'Invalid date';
  }

  if (start === end) {
    return startMoment.format('MMM D');
  }

  if (startMoment.month() === endMoment.month()) {
    return `${startMoment.format('MMM D')} - ${endMoment.format('D')}`;
  }

  return `${startMoment.format('MMM D')} - ${endMoment.format('MMM D')}`;
}

export function getDefaultUserSettings(): UserSettings {
  return {
    normalBedtime: '22:00',
    normalWakeTime: '07:00',
    // chronotype: 'neither',
    useMelatonin: false,
    useMagnesium: false,
  };
}