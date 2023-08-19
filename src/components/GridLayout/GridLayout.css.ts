import { style } from '@vanilla-extract/css'

export const gridLayout = style({
  position: 'relative',
  ':before': {
    content: '',
    /* 
      The CSS variables --cols and --rows are set in the styles of GridLayout,
      alternatively we could have used vanilla extract vars to change the values
      of --cols and --rows but that requires installing a runtime which we want to avoid.
    */
    backgroundSize: `calc(100% / var(--cols)) calc(100% / var(--rows))`,
    backgroundImage:
      'url(data:image/svg+xml;base64,PCEtLSBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGlzIGVkaXRvciB3aXRoIHlvdXIgU1ZHIGNvZGUgLS0+Cgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZC1jZWxsIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkLWNlbGwpIi8+PC9zdmc+)',
    height: '100%',
    width: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    boxShadow: '0px 0px 2px 1px #d1d1d1',
  },
})
