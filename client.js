window.__ModuleLoader__.load({
  id: 'dsh-thinkingview',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CSS = `
.tv-wrap{position:relative;display:inline-flex;align-items:center;gap:1px;padding:2px;
  border-radius:999px;
  background:color-mix(in oklab,currentColor 3.5%,transparent);
  border:1px solid color-mix(in oklab,currentColor 6%,transparent);
  transition:background-color .25s ease,border-color .25s ease}
.tv-ind{position:absolute;top:2px;bottom:2px;left:0;border-radius:999px;pointer-events:none;opacity:0;
  background:color-mix(in oklab,currentColor 12%,transparent)}
.tv-ind[data-ready="true"]{opacity:1;
  transition:transform .3s cubic-bezier(.22,1,.36,1),width .3s cubic-bezier(.22,1,.36,1),opacity .22s ease}
.tv-btn{all:unset;position:relative;z-index:1;box-sizing:border-box;cursor:pointer;font:inherit;
  font-size:11.5px;line-height:1;padding:4px 9px;border-radius:999px;white-space:nowrap;
  opacity:.38;transition:opacity .22s ease,transform .12s ease}
.tv-btn:hover{opacity:.62}
.tv-btn:active{transform:scale(.94)}
.tv-btn[aria-checked="true"]{opacity:.92;font-weight:500}
.tv-btn:focus-visible{outline:2px solid color-mix(in oklab,currentColor 40%,transparent);outline-offset:1px}`;

    /**
     * Composer quick reasoning-effort switch, seated at
     * `conversation.input.right` just left of the official model chip.
     * Subscribes to the same per-session model directory as the official model
     * seat, so a change made in either surface shows up in the other.
     * @param props - owner share plus the injected directory face.
     */
    function ThinkingView({ available, directory, load, select }) {
      const state = React.useSyncExternalStore(
        (fn) => directory.subscribe(fn),
        () => directory.getSnapshot(),
      );
      const wrapRef = React.useRef(null);
      const btnRefs = React.useRef({});
      const [pill, setPill] = React.useState(null);

      React.useEffect(() => { load(); }, []);

      const cur = state.current;
      const model = state.groups
        .find((g) => g.id === cur?.provider)?.models
        .find((m) => m.id === cur?.model);
      const efforts = model?.reasoning?.efforts ?? [];
      const names = efforts.map((level) => level.name).join('|');
      const pending = state.pending ?? null;
      const busy = pending !== null;
      /* Optimistic: while a switch is in flight show the clicked level at once,
         instead of waiting for the round trip to move the highlight. */
      const shown = (busy ? pending.reasoningEffort : undefined)
        ?? cur?.reasoningEffort
        ?? model?.reasoning?.defaultEffort;
      const visible = Boolean(available && cur && efforts.length > 0);

      /* Park the highlight under the active label and let CSS slide it there. */
      React.useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const btn = wrap && btnRefs.current[shown];
        if (!btn) { setPill(null); return undefined; }
        /* Measure in viewport space and rebase onto the wrap's padding box,
           which is what `left:0` on the highlight is anchored to. */
        const measure = () => {
          const wr = wrap.getBoundingClientRect();
          const br = btn.getBoundingClientRect();
          setPill({ x: br.left - wr.left - wrap.clientLeft, w: br.width });
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(wrap);
        ro.observe(btn);
        return () => { ro.disconnect(); };
      }, [shown, names, visible]);

      if (!visible) return null;

      return h('div', {
        ref: wrapRef,
        className: 'tv-wrap',
        role: 'radiogroup',
        'aria-label': 'Reasoning effort',
        'aria-busy': busy || undefined,
        'data-thinkingview': '',
      }, [
        h('span', {
          key: 'pill',
          className: 'tv-ind',
          'aria-hidden': true,
          'data-ready': pill ? 'true' : 'false',
          style: pill ? { transform: `translateX(${pill.x}px)`, width: `${pill.w}px` } : undefined,
        }),
        ...efforts.map((level) => h('button', {
          key: level.id,
          type: 'button',
          role: 'radio',
          className: 'tv-btn',
          'aria-checked': level.id === shown,
          title: level.name,
          ref: (el) => {
            if (el) btnRefs.current[level.id] = el;
            else delete btnRefs.current[level.id];
          },
          onClick: () => {
            if (level.id === shown) return;
            select({
              provider: cur.provider,
              model: cur.model,
              reasoningEffort: level.id,
            });
          },
        }, level.name)),
      ]);
    }

    return {
      inject: ['slots', 'modelDirectories', 'sessions'],
      apply(ctx) {
        ctx.effect(() => {
          const el = document.createElement('style');
          el.setAttribute('data-dsh-thinkingview', '');
          el.textContent = CSS;
          document.head.append(el);
          return () => { el.remove(); };
        }, 'dsh-thinkingview: styles');

        ctx.inject(['slots', 'modelDirectories'], (scope) => {
          const models = scope.modelDirectories;
          const sessions = scope.sessions;
          scope.slots.inject('conversation.input.right', () => scope.slots.register({
            name: 'conversation.input.right',
            id: 'thinkingview',
            order: 10,
            inject: (sessionId) => {
              const directory = models.directoryFor(sessionId);
              const available = sessions.subagentAddress(sessionId) === undefined;
              return {
                available,
                directory: directory.store,
                load: () => { if (available) directory.load().catch(() => {}); },
                select: (selection) => available
                  ? directory.select(selection)
                  : Promise.resolve(undefined),
              };
            },
          }, ThinkingView));
        });
      },
    };
  },
});
