import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { skeletons } from '../components/skeletons.js';
import { states } from '../components/states.js';
import { eventCard } from '../components/event-card.js';
import { observeLazyImages } from '../components/lazy-image.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('events-view', `
  .events-header {
    padding-block: var(--sp-lg) var(--sp-sm);
  }

  .events-title {
    font-size: var(--fs-2xl);
  }

  .events-section {
    margin-bottom: var(--sp-xl);
  }

  .events-section-title {
    font-size: var(--fs-lg);
    margin-bottom: var(--sp-sm);
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-sm);
    padding-bottom: var(--sp-lg);
  }

  .events-empty {
    padding: var(--sp-md);
    opacity: 0.7;
  }
`);

export async function eventsView() {
  await viewContainer.render(`
    <div class="container">
      <div class="events-header">
        <h1 class="events-title">Club Events</h1>
      </div>

      <section class="events-section">
        <h2 class="events-section-title">Upcoming Events</h2>
        <div class="events-list" data-slot="upcoming">
          ${skeletons.eventList(4)}
        </div>
      </section>

      <section class="events-section">
        <h2 class="events-section-title">Past Events</h2>
        <div class="events-list" data-slot="past">
          ${skeletons.eventList(2)}
        </div>
      </section>
    </div>
  `);

  const root = document.querySelector('#app');

  await loadEvents(root);

  return { cleanup: null };
}

async function loadEvents(root) {
  const upcomingSlot = root.querySelector('[data-slot="upcoming"]');
  const pastSlot = root.querySelector('[data-slot="past"]');

  try {
    /*
     * Fetch ALL events.
     *
     * We intentionally do not use:
     * .gte('event_date', today)
     *
     * because we need both upcoming and past events.
     */
    const { data, error } = await supabase
      .from('event_posts')
      .select(`
        slug,
        title,
        location,
        event_date,
        event_time
      `)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });

    if (error) throw error;

    if (!data || !data.length) {
      upcomingSlot.innerHTML = states.empty({
        message: 'No upcoming events scheduled.'
      });

      pastSlot.innerHTML = `
        <div class="events-empty">
          No past events.
        </div>
      `;

      return;
    }

    const now = new Date();

    const events = data.map(event => {
      const startAt =
        event.event_date && event.event_time
          ? `${event.event_date}T${event.event_time}`
          : event.event_date;

      return {
        ...event,
        startAt,
        dateTime: startAt ? new Date(startAt) : null
      };
    });

    const upcomingEvents = events
      .filter(event => {
        return event.dateTime && event.dateTime >= now;
      })
      .sort((a, b) => a.dateTime - b.dateTime);

    const pastEvents = events
      .filter(event => {
        return !event.dateTime || event.dateTime < now;
      })
      .sort((a, b) => b.dateTime - a.dateTime);

    /*
     * Upcoming events
     */
    if (!upcomingEvents.length) {
      upcomingSlot.innerHTML = states.empty({
        message: 'No upcoming events scheduled.'
      });
    } else {
      upcomingSlot.innerHTML = upcomingEvents
        .map(event =>
          eventCard({
            slug: event.slug,
            title: event.title,
            location: event.location,
            startAt: event.startAt
          })
        )
        .join('');

      observeLazyImages(upcomingSlot);
    }

    /*
     * Past events
     */
    if (!pastEvents.length) {
      pastSlot.innerHTML = `
        <div class="events-empty">
          No past events.
        </div>
      `;
    } else {
      pastSlot.innerHTML = pastEvents
        .map(event =>
          eventCard({
            slug: event.slug,
            title: event.title,
            location: event.location,
            startAt: event.startAt
          })
        )
        .join('');

      observeLazyImages(pastSlot);
    }

  } catch (err) {
    console.error('[events] load failed:', err);

    upcomingSlot.innerHTML = states.error();
    pastSlot.innerHTML = '';

    states.bindRetry(upcomingSlot, () => loadEvents(root));
  }
}