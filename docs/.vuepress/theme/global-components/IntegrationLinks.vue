<template>
  <div>
    <!-- React -->
    <div>
      <InstallLink link="../getting-started/react.html">
        <template #icon>
        <svg width="2500" height="2246" viewBox="0 0 256 230" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet"><path d="M.754 114.75c0 19.215 18.763 37.152 48.343 47.263-5.907 29.737-1.058 53.706 15.136 63.045 16.645 9.6 41.443 2.955 64.98-17.62 22.943 19.744 46.13 27.514 62.31 18.148 16.63-9.627 21.687-35.221 15.617-65.887 30.81-10.186 48.044-25.481 48.044-44.949 0-18.769-18.797-35.006-47.979-45.052 6.535-31.933.998-55.32-15.867-65.045-16.259-9.376-39.716-1.204-62.996 19.056C104.122 2.205 80.897-4.36 64.05 5.392 47.806 14.795 43.171 39.2 49.097 69.487 20.515 79.452.754 96.057.754 114.75z" fill="#FFF"></path><path d="M201.025 79.674a151.364 151.364 0 0 0-7.274-2.292 137.5 137.5 0 0 0 1.124-4.961c5.506-26.728 1.906-48.26-10.388-55.348-11.787-6.798-31.065.29-50.535 17.233a151.136 151.136 0 0 0-5.626 5.163 137.573 137.573 0 0 0-3.744-3.458c-20.405-18.118-40.858-25.752-53.139-18.643-11.776 6.817-15.264 27.06-10.307 52.39a150.91 150.91 0 0 0 1.67 7.484c-2.894.822-5.689 1.698-8.363 2.63-23.922 8.34-39.2 21.412-39.2 34.97 0 14.004 16.4 28.05 41.318 36.566a128.44 128.44 0 0 0 6.11 1.91 147.813 147.813 0 0 0-1.775 8.067c-4.726 24.89-1.035 44.653 10.71 51.428 12.131 6.995 32.491-.195 52.317-17.525 1.567-1.37 3.14-2.823 4.715-4.346a148.34 148.34 0 0 0 6.108 5.573c19.204 16.525 38.17 23.198 49.905 16.405 12.12-7.016 16.058-28.247 10.944-54.078-.39-1.973-.845-3.988-1.355-6.04 1.43-.422 2.833-.858 4.202-1.312 25.904-8.582 42.757-22.457 42.757-36.648 0-13.607-15.77-26.767-40.174-35.168z" fill="#53C1DE"></path><path d="M195.406 142.328c-1.235.409-2.503.804-3.795 1.187-2.86-9.053-6.72-18.68-11.442-28.625 4.507-9.71 8.217-19.213 10.997-28.208 2.311.67 4.555 1.375 6.717 2.12 20.91 7.197 33.664 17.84 33.664 26.04 0 8.735-13.775 20.075-36.14 27.486zm-9.28 18.389c2.261 11.422 2.584 21.749 1.086 29.822-1.346 7.254-4.052 12.09-7.398 14.027-7.121 4.122-22.35-1.236-38.772-15.368-1.883-1.62-3.78-3.35-5.682-5.18 6.367-6.964 12.73-15.06 18.94-24.05 10.924-.969 21.244-2.554 30.603-4.717.46 1.86.87 3.683 1.223 5.466zm-93.85 43.137c-6.957 2.457-12.498 2.527-15.847.596-7.128-4.11-10.09-19.98-6.049-41.265a138.507 138.507 0 0 1 1.65-7.502c9.255 2.047 19.5 3.52 30.45 4.408 6.251 8.797 12.798 16.883 19.396 23.964a118.863 118.863 0 0 1-4.305 3.964c-8.767 7.664-17.552 13.1-25.294 15.835zm-32.593-61.58c-11.018-3.766-20.117-8.66-26.354-14-5.604-4.8-8.434-9.565-8.434-13.432 0-8.227 12.267-18.722 32.726-25.855a139.276 139.276 0 0 1 7.777-2.447c2.828 9.197 6.537 18.813 11.013 28.537-4.534 9.869-8.296 19.638-11.15 28.943a118.908 118.908 0 0 1-5.578-1.746zm10.926-74.37c-4.247-21.703-1.427-38.074 5.67-42.182 7.56-4.376 24.275 1.864 41.893 17.507 1.126 1 2.257 2.047 3.39 3.13-6.564 7.049-13.051 15.074-19.248 23.82-10.627.985-20.8 2.567-30.152 4.686a141.525 141.525 0 0 1-1.553-6.962zm97.467 24.067a306.982 306.982 0 0 0-6.871-11.3c7.21.91 14.117 2.12 20.603 3.601-1.947 6.241-4.374 12.767-7.232 19.457a336.42 336.42 0 0 0-6.5-11.758zm-39.747-38.714c4.452 4.823 8.911 10.209 13.297 16.052a284.245 284.245 0 0 0-26.706-.006c4.39-5.789 8.887-11.167 13.409-16.046zm-40.002 38.78a285.24 285.24 0 0 0-6.378 11.685c-2.811-6.667-5.216-13.222-7.18-19.552 6.447-1.443 13.322-2.622 20.485-3.517a283.79 283.79 0 0 0-6.927 11.384zm7.133 57.683c-7.4-.826-14.379-1.945-20.824-3.348 1.995-6.442 4.453-13.138 7.324-19.948a283.494 283.494 0 0 0 6.406 11.692 285.27 285.27 0 0 0 7.094 11.604zm33.136 27.389c-4.575-4.937-9.138-10.397-13.595-16.27 4.326.17 8.737.256 13.22.256 4.606 0 9.159-.103 13.64-.303-4.4 5.98-8.843 11.448-13.265 16.317zm46.072-51.032c3.02 6.884 5.566 13.544 7.588 19.877-6.552 1.495-13.625 2.699-21.078 3.593a337.537 337.537 0 0 0 6.937-11.498 306.632 306.632 0 0 0 6.553-11.972zm-14.915 7.15a316.478 316.478 0 0 1-10.84 17.49c-6.704.479-13.632.726-20.692.726-7.031 0-13.871-.219-20.458-.646A273.798 273.798 0 0 1 96.72 133.28a271.334 271.334 0 0 1-9.64-18.206 273.864 273.864 0 0 1 9.611-18.216v.002a271.252 271.252 0 0 1 10.956-17.442c6.72-.508 13.61-.774 20.575-.774 6.996 0 13.895.268 20.613.78a290.704 290.704 0 0 1 10.887 17.383 316.418 316.418 0 0 1 9.741 18.13 290.806 290.806 0 0 1-9.709 18.29zm19.913-107.792c7.566 4.364 10.509 21.961 5.755 45.038a127.525 127.525 0 0 1-1.016 4.492c-9.374-2.163-19.554-3.773-30.212-4.773-6.209-8.841-12.642-16.88-19.1-23.838a141.92 141.92 0 0 1 5.196-4.766c16.682-14.518 32.273-20.25 39.377-16.153z" fill="#FFF"></path><path d="M128.221 94.665c11.144 0 20.177 9.034 20.177 20.177 0 11.144-9.033 20.178-20.177 20.178-11.143 0-20.177-9.034-20.177-20.178 0-11.143 9.034-20.177 20.177-20.177" fill="#53C1DE"></path></svg>
        </template>
        <template #title>React</template>
        <template #description>
          Consume your API with React
        </template>
      </InstallLink>
    </div>

    <!-- Vue -->
    <div>
      <InstallLink link="../getting-started/vue-js.html">
        <template #icon>
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 261.76 226.69"><g transform="matrix(1.3333 0 0 -1.3333 -76.311 313.34)"><g transform="translate(178.06 235.01)"><path d="m0 0-22.669-39.264-22.669 39.264h-75.491l98.16-170.02 98.16 170.02z" fill="#41b883"/></g><g transform="translate(178.06 235.01)"><path d="m0 0-22.669-39.264-22.669 39.264h-36.227l58.896-102.01 58.896 102.01z" fill="#34495e"/></g></g></svg>
        </template>
        <template #title>Vue.js</template>
        <template #description>
          Consume your API with Vue.js
        </template>
      </InstallLink>
    </div>

    <!-- Angular -->
    <div>
      <InstallLink link="../getting-started/angular.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 250 250" style="enable-background:new 0 0 250 250;" xml:space="preserve">
          <style type="text/css">
          	.st0{fill:#DD0031;}
          	.st1{fill:#C3002F;}
          	.st2{fill:#FFFFFF;}
          </style>
          <g>
          	<polygon class="st0" points="125,30 125,30 125,30 31.9,63.2 46.1,186.3 125,230 125,230 125,230 203.9,186.3 218.1,63.2  "/>
          	<polygon class="st0" points="125,30 125,52.2 125,52.1 125,153.4 125,153.4 125,230 125,230 203.9,186.3 218.1,63.2 125,30  "/>
          	<path class="st3" d="M125,52.1L66.8,182.6h0h21.7h0l11.7-29.2h49.4l11.7,29.2h0h21.7h0L125,52.1L125,52.1L125,52.1L125,52.1   L125,52.1z M142,135.4H108l17-40.9L142,135.4z"/>
          </g>
          </svg>
        </template>
        <template #title>Angular</template>
        <template #description>
          Consume your API with Angular
        </template>
      </InstallLink>
    </div>

    <!-- Next.js -->
    <div>
      <InstallLink link="../getting-started/next-js.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="207px" height="124px" viewBox="0 0 207 124" version="1.1">
            <!-- Generator: Sketch 51.2 (57519) - http://www.bohemiancoding.com/sketch -->
            <title>next-black</title>
            <desc>Created with Sketch.</desc>
            <defs/>
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="Black-Next.js" transform="translate(-247.000000, -138.000000)" fill="#000000" fill-rule="nonzero">
                    <g id="next-black" transform="translate(247.000000, 138.000000)">
                        <g id="EXT-+-Type-something">
                            <path d="M48.9421964,32.6320058 L87.9011585,32.6320058 L87.9011585,35.7136421 L52.5134345,35.7136421 L52.5134345,58.9070103 L85.7908813,58.9070103 L85.7908813,61.9886466 L52.5134345,61.9886466 L52.5134345,87.4526941 L88.306981,87.4526941 L88.306981,90.5343303 L48.9421964,90.5343303 L48.9421964,32.6320058 Z M91.3912326,32.6320058 L95.5306221,32.6320058 L113.8738,58.0960534 L132.622801,32.6320058 L158.124498,0.286809811 L116.22757,60.7722112 L137.817329,90.5343303 L133.51561,90.5343303 L113.8738,63.4483691 L94.1508254,90.5343303 L89.9302715,90.5343303 L111.682358,60.7722112 L91.3912326,32.6320058 Z M139.359455,35.713642 L139.359455,32.6320058 L183.756439,32.6320058 L183.756439,35.7136421 L163.302983,35.7136421 L163.302983,90.5343303 L159.731745,90.5343303 L159.731745,35.7136421 L139.359455,35.713642 Z" id="EXT"/>
                            <polygon id="Type-something" points="0.202923647 32.6320058 4.66697141 32.6320058 66.2235778 124.303087 40.785176 90.5343303 3.93649086 37.0111732 3.77416185 90.5343303 0.202923647 90.5343303"/>
                        </g>
                        <path d="M183.396622,86.5227221 C184.134938,86.5227221 184.673474,85.9601075 184.673474,85.233037 C184.673474,84.5059658 184.134938,83.9433513 183.396622,83.9433513 C182.666993,83.9433513 182.11977,84.5059658 182.11977,85.233037 C182.11977,85.9601075 182.666993,86.5227221 183.396622,86.5227221 Z M186.905793,83.1297235 C186.905793,85.2763149 188.460599,86.678523 190.727662,86.678523 C193.142388,86.678523 194.601647,85.233037 194.601647,82.7229099 L194.601647,73.8855335 L192.655968,73.8855335 L192.655968,82.7142542 C192.655968,84.1078073 191.952397,84.8521899 190.710289,84.8521899 C189.598473,84.8521899 188.842785,84.1597409 188.816727,83.1297235 L186.905793,83.1297235 Z M197.146664,83.0172011 C197.285642,85.2503478 199.153145,86.678523 201.932686,86.678523 C204.903321,86.678523 206.762139,85.1811034 206.762139,82.792155 C206.762139,80.9138876 205.702439,79.8752151 203.131364,79.2779777 L201.750279,78.9404092 C200.117298,78.5595622 199.457158,78.0488813 199.457158,77.1573541 C199.457158,76.0321243 200.482113,75.296398 202.019547,75.296398 C203.478806,75.296398 204.48639,76.0148135 204.668797,77.1660091 L206.562359,77.1660091 C206.44944,75.0626962 204.590622,73.5825873 202.045605,73.5825873 C199.309495,73.5825873 197.48542,75.0626962 197.48542,77.2871878 C197.48542,79.1221767 198.519063,80.2127835 200.786126,80.7407758 L202.401734,81.1302779 C204.060773,81.5197807 204.790402,82.091051 204.790402,83.0431676 C204.790402,84.1510859 203.643842,84.9560573 202.08035,84.9560573 C200.403939,84.9560573 199.240006,84.2030196 199.074971,83.0172011 L197.146664,83.0172011 Z" id=".JS"/>
                    </g>
                </g>
            </g>
        </svg>
        </template>
        <template #title>Next.js</template>
        <template #description>
          Consume your API with Next.js
        </template>
      </InstallLink>
    </div>

    <!-- Nuxt.js -->
    <div>
      <InstallLink link="../getting-started/nuxt-js.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 298">
            <g fill-rule="nonzero" fill="none">
              <path d="M227.92099 82.07407l-13.6889 23.7037-46.8148-81.08641L23.7037 273.58025h97.3037c0 13.0912 10.61252 23.7037 23.70371 23.7037H23.70371c-8.46771 0-16.29145-4.52017-20.5246-11.85382-4.23315-7.33366-4.23272-16.36849.00114-23.70174L146.89383 12.83951c4.23415-7.33433 12.0596-11.85252 20.5284-11.85252 8.46878 0 16.29423 4.51819 20.52839 11.85252l39.97037 69.23456z" fill="#00C58E"/>
              <path d="M331.6642 261.7284l-90.05432-155.95062-13.6889-23.7037-13.68888 23.7037-90.04445 155.95061c-4.23385 7.33325-4.23428 16.36808-.00113 23.70174 4.23314 7.33365 12.05689 11.85382 20.5246 11.85382h166.4c8.46946 0 16.29644-4.51525 20.532-11.84955 4.23555-7.3343 4.23606-16.37123.00132-23.706h.01976zM144.7111 273.58024L227.921 129.48148l83.19012 144.09877h-166.4z" fill="#FFF"/>
              <path d="M396.04938 285.4321c-4.23344 7.33254-12.05656 11.85185-20.52345 11.85185H311.1111c13.0912 0 23.7037-10.6125 23.7037-23.7037h40.66173L260.09877 73.74815l-18.4889 32.02963-13.68888-23.7037L239.5753 61.8963c4.23416-7.33433 12.0596-11.85252 20.5284-11.85252 8.46879 0 16.29423 4.51819 20.52839 11.85252l115.41728 199.8321c4.23426 7.33395 4.23426 16.36975 0 23.7037z" fill="#108775"/>
            </g>
          </svg>
        </template>
        <template #title>Nuxt.js</template>
        <template #description>
          Consume your API with Nuxt.js
        </template>
      </InstallLink>
    </div>

    <!-- GraphQL -->
    <div>
      <InstallLink link="../getting-started/graphql.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="GraphQL_Logo" x="0px" y="0px" viewBox="0 0 400 400" enable-background="new 0 0 400 400" xml:space="preserve">
            <g>
              <g>
                <g>

                    <rect x="122" y="-0.4" transform="matrix(-0.866 -0.5 0.5 -0.866 163.3196 363.3136)" fill="#E535AB" width="16.6" height="320.3"/>
                </g>
              </g>
              <g>
                <g>
                  <rect x="39.8" y="272.2" fill="#E535AB" width="320.3" height="16.6"/>
                </g>
              </g>
              <g>
                <g>

                    <rect x="37.9" y="312.2" transform="matrix(-0.866 -0.5 0.5 -0.866 83.0693 663.3409)" fill="#E535AB" width="185" height="16.6"/>
                </g>
              </g>
              <g>
                <g>

                    <rect x="177.1" y="71.1" transform="matrix(-0.866 -0.5 0.5 -0.866 463.3409 283.0693)" fill="#E535AB" width="185" height="16.6"/>
                </g>
              </g>
              <g>
                <g>

                    <rect x="122.1" y="-13" transform="matrix(-0.5 -0.866 0.866 -0.5 126.7903 232.1221)" fill="#E535AB" width="16.6" height="185"/>
                </g>
              </g>
              <g>
                <g>

                    <rect x="109.6" y="151.6" transform="matrix(-0.5 -0.866 0.866 -0.5 266.0828 473.3766)" fill="#E535AB" width="320.3" height="16.6"/>
                </g>
              </g>
              <g>
                <g>
                  <rect x="52.5" y="107.5" fill="#E535AB" width="16.6" height="185"/>
                </g>
              </g>
              <g>
                <g>
                  <rect x="330.9" y="107.5" fill="#E535AB" width="16.6" height="185"/>
                </g>
              </g>
              <g>
                <g>

                    <rect x="262.4" y="240.1" transform="matrix(-0.5 -0.866 0.866 -0.5 126.7953 714.2875)" fill="#E535AB" width="14.5" height="160.9"/>
                </g>
              </g>
              <path fill="#E535AB" d="M369.5,297.9c-9.6,16.7-31,22.4-47.7,12.8c-16.7-9.6-22.4-31-12.8-47.7c9.6-16.7,31-22.4,47.7-12.8   C373.5,259.9,379.2,281.2,369.5,297.9"/>
              <path fill="#E535AB" d="M90.9,137c-9.6,16.7-31,22.4-47.7,12.8c-16.7-9.6-22.4-31-12.8-47.7c9.6-16.7,31-22.4,47.7-12.8   C94.8,99,100.5,120.3,90.9,137"/>
              <path fill="#E535AB" d="M30.5,297.9c-9.6-16.7-3.9-38,12.8-47.7c16.7-9.6,38-3.9,47.7,12.8c9.6,16.7,3.9,38-12.8,47.7   C61.4,320.3,40.1,314.6,30.5,297.9"/>
              <path fill="#E535AB" d="M309.1,137c-9.6-16.7-3.9-38,12.8-47.7c16.7-9.6,38-3.9,47.7,12.8c9.6,16.7,3.9,38-12.8,47.7   C340.1,159.4,318.7,153.7,309.1,137"/>
              <path fill="#E535AB" d="M200,395.8c-19.3,0-34.9-15.6-34.9-34.9c0-19.3,15.6-34.9,34.9-34.9c19.3,0,34.9,15.6,34.9,34.9   C234.9,380.1,219.3,395.8,200,395.8"/>
              <path fill="#E535AB" d="M200,74c-19.3,0-34.9-15.6-34.9-34.9c0-19.3,15.6-34.9,34.9-34.9c19.3,0,34.9,15.6,34.9,34.9   C234.9,58.4,219.3,74,200,74"/>
            </g>
            </svg>

        </template>
        <template #title>GraphQL</template>
        <template #description>
          Get started with GraphQL
        </template>
      </InstallLink>
    </div>

    <!-- Gatsby -->
    <div>
      <InstallLink link="../getting-started/gatsby.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" focusable="false"><title>Gatsby</title><path fill="#663399" d="M14,0C6.268,0,0,6.268,0,14s6.268,14,14,14s14-6.268,14-14S21.732,0,14,0z M6.2,21.8 C4.1,19.7,3,16.9,3,14.2L13.9,25C11.1,24.9,8.3,23.9,6.2,21.8z M16.4,24.7L3.3,11.6C4.4,6.7,8.8,3,14,3c3.7,0,6.9,1.8,8.9,4.5 l-1.5,1.3C19.7,6.5,17,5,14,5c-3.9,0-7.2,2.5-8.5,6L17,22.5c2.9-1,5.1-3.5,5.8-6.5H18v-2h7C25,19.2,21.3,23.6,16.4,24.7z"></path><g id="innards" fill="white"><path d="M6.2,21.8C4.1,19.7,3,16.9,3,14.2L13.9,25C11.1,24.9,8.3,23.9,6.2,21.8z"></path><path d="M16.4,24.7L3.3,11.6C4.4,6.7,8.8,3,14,3c3.7,0,6.9,1.8,8.9,4.5l-1.5,1.3C19.7,6.5,17,5,14,5 c-3.9,0-7.2,2.5-8.5,6L17,22.5c2.9-1,5.1-3.5,5.8-6.5H18v-2h7C25,19.2,21.3,23.6,16.4,24.7z"></path></g></svg>
        </template>
        <template #title>Gatsby</template>
        <template #description>
          Consume your API with Gatsby
        </template>
      </InstallLink>
    </div>

    <!-- Grisdome -->
    <div>
      <InstallLink link="../getting-started/gridsome.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
            <rect width="512" height="512" rx="256" fill="white"/>
            <path d="M405.171 228.04C422.837 227.19 438.475 240.895 440 258.577C446.608 344.114 368.326 439.935 258.01 442.999C165.046 445.294 73.1016 370.866 73.1016 258.331C73.1016 240.596 87.7568 226.219 105.443 226.219C123.129 226.219 137.466 240.596 137.466 258.331C137.466 332.355 196.986 380.261 256.434 378.794C329.618 376.761 377.194 313.393 374.719 261.654C373.871 243.939 387.505 228.89 405.171 228.04Z" fill="url(#paint0_linear)"/>
            <path d="M325.172 260.822C325.172 242.664 339.982 227.945 358.252 227.945H406.462C424.731 227.945 440 242.664 440 260.822C440 278.979 424.731 293.699 406.462 293.699H358.252C339.982 293.699 325.172 278.979 325.172 260.822Z" fill="#00A672"/>
            <path d="M224.018 260.87C224.018 242.686 238.735 227.945 256.868 227.945C275.002 227.945 289.719 242.686 289.719 260.87C289.719 279.054 275.002 293.795 256.868 293.795C238.735 293.795 224.018 279.054 224.018 260.87Z" fill="#00A672"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M288.808 107.038C289.542 124.758 275.812 139.719 258.141 140.455C181.858 143.632 135.288 203.587 137.555 260.515C138.261 278.236 124.794 293.176 107.122 293.883C89.4496 294.591 73.9088 280.289 73.2032 262.568C69.5093 169.798 146.755 78.0864 255.483 76.2853C273.154 75.5494 288.074 89.3177 288.808 107.038Z" fill="#00A672"/>
            <defs>
            <linearGradient id="paint0_linear" x1="256.745" y1="226.219" x2="256.745" y2="443.051" gradientUnits="userSpaceOnUse">
            <stop stop-color="#00583E"/>
            <stop offset="1" stop-color="#00835C"/>
            </linearGradient>
            </defs>
          </svg>
        </template>
        <template #title>Grisdome</template>
        <template #description>
          Consume your API with Grisdome
        </template>
      </InstallLink>
    </div>

    <!-- Jekyll -->
    <div>
      <InstallLink link="../getting-started/jekyll.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><defs><linearGradient id="A" y2="277.465" x2="296.661" y1="238.547" x1="195.456" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#919191"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="B" y2="327.266" x2="254.14" y1="303.705" x1="192.87" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#900"/><stop offset="1" stop-color="#e80000"/></linearGradient></defs><g transform="matrix(.077756 0 0 .077756 -3.451258 -3.954841)"><path d="M269.02 59.15c-.184.737-.188 1.53-.033 2.365 0 0 2.507 16.642-.34 24.048L147.652 400.2c-8.636 23.1 2.937 48.91 26.014 57.787s48.955-2.524 58.03-25.464l.01.005 121.005-314.634c2.366-6.155 15.86-18.08 15.86-18.08.677-.516 1.202-1.108 1.56-1.778l.06-.122c.065-.132.14-.258.193-.395 3.12-8.113-17.005-23.405-44.952-34.152s-53.133-12.884-56.253-4.77c-.053.137-.083.28-.122.422l-.037.13z" opacity=".3"/><path d="M265.523 56.477c-.185.737-.2 1.53-.033 2.365 0 0 2.508 16.642-.34 24.048L144.155 397.526c-8.635 23.1 2.937 48.91 26.014 57.787s48.955-2.524 58.03-25.464v.005L349.215 115.22c2.365-6.155 15.86-18.08 15.86-18.08.677-.516 1.202-1.107 1.56-1.778l.058-.122c.065-.13.14-.258.193-.395 3.12-8.113-17.005-23.404-44.95-34.152s-53.133-12.884-56.253-4.77c-.053.137-.083.28-.122.422l-.037.132z" fill="url(#A)"/><path d="M303.48 198.814L216.275 425.73c-6.436 16.262-25.166 24.723-41.78 18.333s-25.608-25.512-19.488-41.897l55.758-144.982s6.964-11.233 20.637-19.225 24.95-6.305 40.132-13.053 31.947-26.093 31.947-26.093z" fill="url(#B)"/><ellipse ry="8.85" rx="33.648" cy="76.201" cx="315.97" transform="matrix(.9334 .359 -.359 .9334 48.4129 -108.3439)" fill="#333"/><g fill="#fff"><path d="M265.49 58.84s2.47 16.737-.34 24.048L144.155 397.526c-8.635 23.1 2.937 48.91 26.014 57.787 4.005 1.54 8.092 2.455 12.164 2.822-15.556-11.702-22.23-32.632-15.093-51.73l-.01-.004L285.833 98.01S269.69 82.85 265.49 58.84z" opacity=".3"/><circle r="3.506" cy="261.806" cx="226.531" opacity=".5"/><circle r="5.285" cy="287.227" cx="249.514" opacity=".5"/><circle r="9.915" cy="317.459" cx="214.429" opacity=".5"/><circle r="5.286" cy="335.795" cx="198.375" opacity=".5"/><circle r="3.506" cy="375.008" cx="219.43" opacity=".5"/></g></g></svg>
        </template>
        <template #title>Jekyll</template>
        <template #description>
          Consume your API with Jekyll
        </template>
      </InstallLink>
    </div>

    <!-- 11ty -->
    <div>
      <InstallLink link="../getting-started/11ty.html">
        <template #icon>
        <svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="400.000000pt" height="400.000000pt" viewBox="0 0 400.000000 400.000000" preserveAspectRatio="xMidYMid meet">
        <metadata>
        Created by potrace 1.16, written by Peter Selinger 2001-2019
        </metadata>
        <g transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
        <path d="M0 2000 l0 -2000 2000 0 2000 0 0 2000 0 2000 -2000 0 -2000 0 0 -2000z m2212 883 c16 -15 18 -35 18 -230 l0 -213 59 0 c86 0 106 -19 106 -103 0 -85 -10 -95 -93 -99 l-67 -3 0 -295 c0 -357 -1 -353 90 -358 81 -4 95 -18 95 -97 0 -90 -12 -98 -137 -93 -113 4 -171 28 -210 87 -50 74 -55 114 -60 449 l-5 312 -34 0 c-43 0 -54 21 -54 104 0 56 3 67 22 80 12 9 32 16 44 16 28 0 34 22 34 130 2 149 15 297 29 314 19 23 137 22 163 -1z m-927 -47 c14 -20 15 -106 13 -720 -3 -811 12 -726 -129 -726 -79 0 -89 2 -103 22 -14 20 -16 92 -16 590 l0 567 -48 -6 c-44 -5 -49 -3 -60 21 -7 15 -12 58 -12 95 0 97 7 103 170 145 164 42 166 42 185 12z m496 7 c12 -13 14 -137 14 -713 0 -820 13 -740 -124 -740 -47 0 -91 4 -98 8 -30 19 -33 70 -33 618 l0 554 -42 -6 c-33 -6 -44 -4 -55 11 -15 22 -18 171 -3 195 9 15 251 86 301 89 15 0 33 -6 40 -16z m869 -413 c24 -13 28 -27 86 -342 27 -142 49 -256 50 -255 3 3 84 541 84 556 0 26 45 51 93 51 70 0 87 -12 87 -62 0 -56 -185 -1013 -212 -1095 -12 -37 -35 -79 -53 -98 -57 -61 -174 -70 -235 -19 -27 23 -30 31 -30 85 0 80 20 102 80 87 54 -14 63 -4 68 75 3 53 -12 128 -102 504 -58 243 -106 453 -106 466 0 44 24 57 101 57 39 0 79 -5 89 -10z"/>
        </g>
        </svg>
        </template>
        <template #title>11ty</template>
        <template #description>
          Consume your API with 11ty
        </template>
      </InstallLink>
    </div>

    <!-- Svelte -->
    <div>
      <InstallLink link="../getting-started/svelte.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 98.1 118" style="enable-background:new 0 0 98.1 118;" xml:space="preserve">
          <style type="text/css">
            .st0{fill:#FF3E00;}
            .st1{fill:#FFFFFF;}
          </style>
          <path class="st0" d="M91.8,15.6C80.9-0.1,59.2-4.7,43.6,5.2L16.1,22.8C8.6,27.5,3.4,35.2,1.9,43.9c-1.3,7.3-0.2,14.8,3.3,21.3  c-2.4,3.6-4,7.6-4.7,11.8c-1.6,8.9,0.5,18.1,5.7,25.4c11,15.7,32.6,20.3,48.2,10.4l27.5-17.5c7.5-4.7,12.7-12.4,14.2-21.1  c1.3-7.3,0.2-14.8-3.3-21.3c2.4-3.6,4-7.6,4.7-11.8C99.2,32.1,97.1,22.9,91.8,15.6"/>
          <path class="st1" d="M40.9,103.9c-8.9,2.3-18.2-1.2-23.4-8.7c-3.2-4.4-4.4-9.9-3.5-15.3c0.2-0.9,0.4-1.7,0.6-2.6l0.5-1.6l1.4,1  c3.3,2.4,6.9,4.2,10.8,5.4l1,0.3l-0.1,1c-0.1,1.4,0.3,2.9,1.1,4.1c1.6,2.3,4.4,3.4,7.1,2.7c0.6-0.2,1.2-0.4,1.7-0.7L65.5,72  c1.4-0.9,2.3-2.2,2.6-3.8c0.3-1.6-0.1-3.3-1-4.6c-1.6-2.3-4.4-3.3-7.1-2.6c-0.6,0.2-1.2,0.4-1.7,0.7l-10.5,6.7  c-1.7,1.1-3.6,1.9-5.6,2.4c-8.9,2.3-18.2-1.2-23.4-8.7c-3.1-4.4-4.4-9.9-3.4-15.3c0.9-5.2,4.1-9.9,8.6-12.7l27.5-17.5  c1.7-1.1,3.6-1.9,5.6-2.5c8.9-2.3,18.2,1.2,23.4,8.7c3.2,4.4,4.4,9.9,3.5,15.3c-0.2,0.9-0.4,1.7-0.7,2.6l-0.5,1.6l-1.4-1  c-3.3-2.4-6.9-4.2-10.8-5.4l-1-0.3l0.1-1c0.1-1.4-0.3-2.9-1.1-4.1c-1.6-2.3-4.4-3.3-7.1-2.6c-0.6,0.2-1.2,0.4-1.7,0.7L32.4,46.1  c-1.4,0.9-2.3,2.2-2.6,3.8s0.1,3.3,1,4.6c1.6,2.3,4.4,3.3,7.1,2.6c0.6-0.2,1.2-0.4,1.7-0.7l10.5-6.7c1.7-1.1,3.6-1.9,5.6-2.5  c8.9-2.3,18.2,1.2,23.4,8.7c3.2,4.4,4.4,9.9,3.5,15.3c-0.9,5.2-4.1,9.9-8.6,12.7l-27.5,17.5C44.8,102.5,42.9,103.3,40.9,103.9"/>
          </svg>
        </template>
        <template #title>Svelte</template>
        <template #description>
          Consume your API with Svelte
        </template>
      </InstallLink>
    </div>


    <!-- Sapper -->
    <div>
      <InstallLink link="../getting-started/sapper.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 98.1 118" style="enable-background:new 0 0 98.1 118;" xml:space="preserve">
          <style type="text/css">
            .st2{fill:#159497;}
            .st3{fill:#FFFFFF;}
          </style>
          <path class="st2" d="M91.8,15.6C80.9-0.1,59.2-4.7,43.6,5.2L16.1,22.8C8.6,27.5,3.4,35.2,1.9,43.9c-1.3,7.3-0.2,14.8,3.3,21.3  c-2.4,3.6-4,7.6-4.7,11.8c-1.6,8.9,0.5,18.1,5.7,25.4c11,15.7,32.6,20.3,48.2,10.4l27.5-17.5c7.5-4.7,12.7-12.4,14.2-21.1  c1.3-7.3,0.2-14.8-3.3-21.3c2.4-3.6,4-7.6,4.7-11.8C99.2,32.1,97.1,22.9,91.8,15.6"/>
          <path class="st3" d="M40.9,103.9c-8.9,2.3-18.2-1.2-23.4-8.7c-3.2-4.4-4.4-9.9-3.5-15.3c0.2-0.9,0.4-1.7,0.6-2.6l0.5-1.6l1.4,1  c3.3,2.4,6.9,4.2,10.8,5.4l1,0.3l-0.1,1c-0.1,1.4,0.3,2.9,1.1,4.1c1.6,2.3,4.4,3.4,7.1,2.7c0.6-0.2,1.2-0.4,1.7-0.7L65.5,72  c1.4-0.9,2.3-2.2,2.6-3.8c0.3-1.6-0.1-3.3-1-4.6c-1.6-2.3-4.4-3.3-7.1-2.6c-0.6,0.2-1.2,0.4-1.7,0.7l-10.5,6.7  c-1.7,1.1-3.6,1.9-5.6,2.4c-8.9,2.3-18.2-1.2-23.4-8.7c-3.1-4.4-4.4-9.9-3.4-15.3c0.9-5.2,4.1-9.9,8.6-12.7l27.5-17.5  c1.7-1.1,3.6-1.9,5.6-2.5c8.9-2.3,18.2,1.2,23.4,8.7c3.2,4.4,4.4,9.9,3.5,15.3c-0.2,0.9-0.4,1.7-0.7,2.6l-0.5,1.6l-1.4-1  c-3.3-2.4-6.9-4.2-10.8-5.4l-1-0.3l0.1-1c0.1-1.4-0.3-2.9-1.1-4.1c-1.6-2.3-4.4-3.3-7.1-2.6c-0.6,0.2-1.2,0.4-1.7,0.7L32.4,46.1  c-1.4,0.9-2.3,2.2-2.6,3.8s0.1,3.3,1,4.6c1.6,2.3,4.4,3.3,7.1,2.6c0.6-0.2,1.2-0.4,1.7-0.7l10.5-6.7c1.7-1.1,3.6-1.9,5.6-2.5  c8.9-2.3,18.2,1.2,23.4,8.7c3.2,4.4,4.4,9.9,3.5,15.3c-0.9,5.2-4.1,9.9-8.6,12.7l-27.5,17.5C44.8,102.5,42.9,103.3,40.9,103.9"/>
          </svg>
        </template>
        <template #title>Sapper</template>
        <template #description>
          Consume your API with Sapper
        </template>
      </InstallLink>
    </div>

    <!-- Ruby -->
    <div>
      <InstallLink link="../getting-started/ruby.html">
        <template #icon>
          <svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" id="Layer_1" width="198.13" height="197.58" viewBox="0 0 198.13 197.58" overflow="visible" enable-background="new 0 0 198.13 197.58" xml:space="preserve" inkscape:version="0.48.0 r9654" sodipodi:docname="Logo-Ruby.svg"><metadata id="metadata3320"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/></cc:Work></rdf:RDF></metadata><defs id="defs3489"><linearGradient id="XMLID_17_-9" gradientUnits="userSpaceOnUse" x1="174.0737" y1="215.5488" x2="132.27631" y2="141.7533"><stop offset="0" style="stop-color:#FB7655" id="stop3272-4"/><stop offset="0" style="stop-color:#FB7655" id="stop3274-5"/><stop offset="0.41" style="stop-color:#E42B1E" id="stop3276-1"/><stop offset="0.99" style="stop-color:#990000" id="stop3278-0"/><stop offset="1" style="stop-color:#990000" id="stop3280-3"/></linearGradient><linearGradient id="XMLID_18_-7" gradientUnits="userSpaceOnUse" x1="194.895" y1="153.5576" x2="141.0276" y2="117.4093"><stop offset="0" style="stop-color:#871101" id="stop3285-8"/><stop offset="0" style="stop-color:#871101" id="stop3287-8"/><stop offset="0.99" style="stop-color:#911209" id="stop3289-6"/><stop offset="1" style="stop-color:#911209" id="stop3291-0"/></linearGradient><linearGradient id="XMLID_19_-4" gradientUnits="userSpaceOnUse" x1="151.79539" y1="217.7852" x2="97.929703" y2="181.638"><stop offset="0" style="stop-color:#871101" id="stop3296-6"/><stop offset="0" style="stop-color:#871101" id="stop3298-7"/><stop offset="0.99" style="stop-color:#911209" id="stop3300-6"/><stop offset="1" style="stop-color:#911209" id="stop3302-0"/></linearGradient><linearGradient id="XMLID_20_-9" gradientUnits="userSpaceOnUse" x1="38.696301" y1="127.3906" x2="47.046902" y2="181.66141"><stop offset="0" style="stop-color:#FFFFFF" id="stop3307-7"/><stop offset="0" style="stop-color:#FFFFFF" id="stop3309-5"/><stop offset="0.23" style="stop-color:#E57252" id="stop3311-9"/><stop offset="0.46" style="stop-color:#DE3B20" id="stop3313-7"/><stop offset="0.99" style="stop-color:#A60003" id="stop3315-8"/><stop offset="1" style="stop-color:#A60003" id="stop3317-5"/></linearGradient><linearGradient id="XMLID_21_-3" gradientUnits="userSpaceOnUse" x1="96.132797" y1="76.715302" x2="99.209602" y2="132.1021"><stop offset="0" style="stop-color:#FFFFFF" id="stop3322-3"/><stop offset="0" style="stop-color:#FFFFFF" id="stop3324-8"/><stop offset="0.23" style="stop-color:#E4714E" id="stop3326-3"/><stop offset="0.56" style="stop-color:#BE1A0D" id="stop3328-7"/><stop offset="0.99" style="stop-color:#A80D00" id="stop3330-9"/><stop offset="1" style="stop-color:#A80D00" id="stop3332-3"/></linearGradient><linearGradient id="XMLID_22_-7" gradientUnits="userSpaceOnUse" x1="147.103" y1="25.521" x2="156.3141" y2="65.216202"><stop offset="0" style="stop-color:#FFFFFF" id="stop3337-8"/><stop offset="0" style="stop-color:#FFFFFF" id="stop3339-7"/><stop offset="0.18" style="stop-color:#E46342" id="stop3341-4"/><stop offset="0.4" style="stop-color:#C82410" id="stop3343-1"/><stop offset="0.99" style="stop-color:#A80D00" id="stop3345-9"/><stop offset="1" style="stop-color:#A80D00" id="stop3347-0"/></linearGradient><linearGradient id="XMLID_23_-9" gradientUnits="userSpaceOnUse" x1="118.9761" y1="11.5415" x2="158.66859" y2="-8.3048"><stop offset="0" style="stop-color:#FFFFFF" id="stop3352-8"/><stop offset="0" style="stop-color:#FFFFFF" id="stop3354-8"/><stop offset="0.54" style="stop-color:#C81F11" id="stop3356-5"/><stop offset="0.99" style="stop-color:#BF0905" id="stop3358-8"/><stop offset="1" style="stop-color:#BF0905" id="stop3360-4"/></linearGradient><linearGradient id="XMLID_24_-3" gradientUnits="userSpaceOnUse" x1="3.9033" y1="113.5547" x2="7.1701999" y2="146.2628"><stop offset="0" style="stop-color:#FFFFFF" id="stop3365-7"/><stop offset="0" style="stop-color:#FFFFFF" id="stop3367-1"/><stop offset="0.31" style="stop-color:#DE4024" id="stop3369-3"/><stop offset="0.99" style="stop-color:#BF190B" id="stop3371-8"/><stop offset="1" style="stop-color:#BF190B" id="stop3373-0"/></linearGradient><linearGradient id="XMLID_25_-9" gradientUnits="userSpaceOnUse" x1="-18.5557" y1="155.10451" x2="135.0152" y2="-2.8092999"><stop offset="0" style="stop-color:#BD0012" id="stop3380-7"/><stop offset="0" style="stop-color:#BD0012" id="stop3382-9"/><stop offset="0.07" style="stop-color:#FFFFFF" id="stop3384-9"/><stop offset="0.17" style="stop-color:#FFFFFF" id="stop3386-3"/><stop offset="0.27" style="stop-color:#C82F1C" id="stop3388-2"/><stop offset="0.33" style="stop-color:#820C01" id="stop3390-4"/><stop offset="0.46" style="stop-color:#A31601" id="stop3392-3"/><stop offset="0.72" style="stop-color:#B31301" id="stop3394-7"/><stop offset="0.99" style="stop-color:#E82609" id="stop3396-1"/><stop offset="1" style="stop-color:#E82609" id="stop3398-2"/></linearGradient><linearGradient id="XMLID_26_-2" gradientUnits="userSpaceOnUse" x1="99.074699" y1="171.0332" x2="52.817699" y2="159.61659"><stop offset="0" style="stop-color:#8C0C01" id="stop3403-0"/><stop offset="0" style="stop-color:#8C0C01" id="stop3405-2"/><stop offset="0.54" style="stop-color:#990C00" id="stop3407-1"/><stop offset="0.99" style="stop-color:#A80D0E" id="stop3409-7"/><stop offset="1" style="stop-color:#A80D0E" id="stop3411-5"/></linearGradient><linearGradient id="XMLID_27_-1" gradientUnits="userSpaceOnUse" x1="178.52589" y1="115.5146" x2="137.43269" y2="78.683998"><stop offset="0" style="stop-color:#7E110B" id="stop3416-7"/><stop offset="0" style="stop-color:#7E110B" id="stop3418-4"/><stop offset="0.99" style="stop-color:#9E0C00" id="stop3420-1"/><stop offset="1" style="stop-color:#9E0C00" id="stop3422-7"/></linearGradient><linearGradient id="XMLID_28_-1" gradientUnits="userSpaceOnUse" x1="193.6235" y1="47.937" x2="173.15421" y2="26.053801"><stop offset="0" style="stop-color:#79130D" id="stop3427-1"/><stop offset="0" style="stop-color:#79130D" id="stop3429-1"/><stop offset="0.99" style="stop-color:#9E120B" id="stop3431-7"/><stop offset="1" style="stop-color:#9E120B" id="stop3433-0"/></linearGradient><radialGradient id="XMLID_29_-4" cx="143.8315" cy="79.388199" r="50.357601" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#A80D00" id="stop3440-0"/><stop offset="0" style="stop-color:#A80D00" id="stop3442-8"/><stop offset="0.99" style="stop-color:#7E0E08" id="stop3444-5"/><stop offset="1" style="stop-color:#7E0E08" id="stop3446-1"/></radialGradient><radialGradient id="XMLID_30_-6" cx="74.0923" cy="145.75101" r="66.943703" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#A30C00" id="stop3451-6"/><stop offset="0" style="stop-color:#A30C00" id="stop3453-2"/><stop offset="0.99" style="stop-color:#800E08" id="stop3455-1"/><stop offset="1" style="stop-color:#800E08" id="stop3457-9"/></radialGradient><linearGradient id="XMLID_31_-6" gradientUnits="userSpaceOnUse" x1="26.669901" y1="197.33591" x2="9.9886999" y2="140.742"><stop offset="0" style="stop-color:#8B2114" id="stop3462-4"/><stop offset="0" style="stop-color:#8B2114" id="stop3464-8"/><stop offset="0.43" style="stop-color:#9E100A" id="stop3466-0"/><stop offset="0.99" style="stop-color:#B3100C" id="stop3468-8"/><stop offset="1" style="stop-color:#B3100C" id="stop3470-1"/></linearGradient><linearGradient id="XMLID_32_-0" gradientUnits="userSpaceOnUse" x1="154.6411" y1="9.7979002" x2="192.039" y2="26.305901"><stop offset="0" style="stop-color:#B31000" id="stop3475-2"/><stop offset="0" style="stop-color:#B31000" id="stop3477-2"/><stop offset="0.44" style="stop-color:#910F08" id="stop3479-9"/><stop offset="0.99" style="stop-color:#791C12" id="stop3481-7"/><stop offset="1" style="stop-color:#791C12" id="stop3483-5"/></linearGradient><linearGradient y2="141.7533" x2="132.27631" y1="215.5488" x1="174.0737" gradientUnits="userSpaceOnUse" id="linearGradient3448" xlink:href="#XMLID_17_-9" inkscape:collect="always"/></defs><sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="1036" inkscape:window-height="1124" id="namedview3487" showgrid="false" inkscape:zoom="1.3412289" inkscape:cx="99.065005" inkscape:cy="98.790004" inkscape:window-x="882" inkscape:window-y="24" inkscape:window-maximized="0" inkscape:current-layer="Layer_1"/>
          <linearGradient id="XMLID_17_" gradientUnits="userSpaceOnUse" x1="174.0737" y1="215.5488" x2="132.2763" y2="141.7533">
            <stop offset="0" style="stop-color:#FB7655" id="stop3272"/>
            <stop offset="0" style="stop-color:#FB7655" id="stop3274"/>
            <stop offset="0.41" style="stop-color:#E42B1E" id="stop3276"/>
            <stop offset="0.99" style="stop-color:#990000" id="stop3278"/>
            <stop offset="1" style="stop-color:#990000" id="stop3280"/>
          </linearGradient>

          <linearGradient id="XMLID_18_" gradientUnits="userSpaceOnUse" x1="194.895" y1="153.5576" x2="141.0276" y2="117.4093">
            <stop offset="0" style="stop-color:#871101" id="stop3285"/>
            <stop offset="0" style="stop-color:#871101" id="stop3287"/>
            <stop offset="0.99" style="stop-color:#911209" id="stop3289"/>
            <stop offset="1" style="stop-color:#911209" id="stop3291"/>
          </linearGradient>

          <linearGradient id="XMLID_19_" gradientUnits="userSpaceOnUse" x1="151.7954" y1="217.7852" x2="97.9297" y2="181.638">
            <stop offset="0" style="stop-color:#871101" id="stop3296"/>
            <stop offset="0" style="stop-color:#871101" id="stop3298"/>
            <stop offset="0.99" style="stop-color:#911209" id="stop3300"/>
            <stop offset="1" style="stop-color:#911209" id="stop3302"/>
          </linearGradient>

          <linearGradient id="XMLID_20_" gradientUnits="userSpaceOnUse" x1="38.6963" y1="127.3906" x2="47.0469" y2="181.6614">
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3307"/>
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3309"/>
            <stop offset="0.23" style="stop-color:#E57252" id="stop3311"/>
            <stop offset="0.46" style="stop-color:#DE3B20" id="stop3313"/>
            <stop offset="0.99" style="stop-color:#A60003" id="stop3315"/>
            <stop offset="1" style="stop-color:#A60003" id="stop3317"/>
          </linearGradient>

          <linearGradient id="XMLID_21_" gradientUnits="userSpaceOnUse" x1="96.1328" y1="76.7153" x2="99.2096" y2="132.1021">
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3322"/>
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3324"/>
            <stop offset="0.23" style="stop-color:#E4714E" id="stop3326"/>
            <stop offset="0.56" style="stop-color:#BE1A0D" id="stop3328"/>
            <stop offset="0.99" style="stop-color:#A80D00" id="stop3330"/>
            <stop offset="1" style="stop-color:#A80D00" id="stop3332"/>
          </linearGradient>

          <linearGradient id="XMLID_22_" gradientUnits="userSpaceOnUse" x1="147.103" y1="25.521" x2="156.3141" y2="65.2162">
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3337"/>
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3339"/>
            <stop offset="0.18" style="stop-color:#E46342" id="stop3341"/>
            <stop offset="0.4" style="stop-color:#C82410" id="stop3343"/>
            <stop offset="0.99" style="stop-color:#A80D00" id="stop3345"/>
            <stop offset="1" style="stop-color:#A80D00" id="stop3347"/>
          </linearGradient>

          <linearGradient id="XMLID_23_" gradientUnits="userSpaceOnUse" x1="118.9761" y1="11.5415" x2="158.6686" y2="-8.3048">
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3352"/>
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3354"/>
            <stop offset="0.54" style="stop-color:#C81F11" id="stop3356"/>
            <stop offset="0.99" style="stop-color:#BF0905" id="stop3358"/>
            <stop offset="1" style="stop-color:#BF0905" id="stop3360"/>
          </linearGradient>

          <linearGradient id="XMLID_24_" gradientUnits="userSpaceOnUse" x1="3.9033" y1="113.5547" x2="7.1702" y2="146.2628">
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3365"/>
            <stop offset="0" style="stop-color:#FFFFFF" id="stop3367"/>
            <stop offset="0.31" style="stop-color:#DE4024" id="stop3369"/>
            <stop offset="0.99" style="stop-color:#BF190B" id="stop3371"/>
            <stop offset="1" style="stop-color:#BF190B" id="stop3373"/>
          </linearGradient>


          <linearGradient id="XMLID_25_" gradientUnits="userSpaceOnUse" x1="-18.5557" y1="155.1045" x2="135.0152" y2="-2.8093">
            <stop offset="0" style="stop-color:#BD0012" id="stop3380"/>
            <stop offset="0" style="stop-color:#BD0012" id="stop3382"/>
            <stop offset="0.07" style="stop-color:#FFFFFF" id="stop3384"/>
            <stop offset="0.17" style="stop-color:#FFFFFF" id="stop3386"/>
            <stop offset="0.27" style="stop-color:#C82F1C" id="stop3388"/>
            <stop offset="0.33" style="stop-color:#820C01" id="stop3390"/>
            <stop offset="0.46" style="stop-color:#A31601" id="stop3392"/>
            <stop offset="0.72" style="stop-color:#B31301" id="stop3394"/>
            <stop offset="0.99" style="stop-color:#E82609" id="stop3396"/>
            <stop offset="1" style="stop-color:#E82609" id="stop3398"/>
          </linearGradient>

          <linearGradient id="XMLID_26_" gradientUnits="userSpaceOnUse" x1="99.0747" y1="171.0332" x2="52.8177" y2="159.6166">
            <stop offset="0" style="stop-color:#8C0C01" id="stop3403"/>
            <stop offset="0" style="stop-color:#8C0C01" id="stop3405"/>
            <stop offset="0.54" style="stop-color:#990C00" id="stop3407"/>
            <stop offset="0.99" style="stop-color:#A80D0E" id="stop3409"/>
            <stop offset="1" style="stop-color:#A80D0E" id="stop3411"/>
          </linearGradient>

          <linearGradient id="XMLID_27_" gradientUnits="userSpaceOnUse" x1="178.5259" y1="115.5146" x2="137.4327" y2="78.684">
            <stop offset="0" style="stop-color:#7E110B" id="stop3416"/>
            <stop offset="0" style="stop-color:#7E110B" id="stop3418"/>
            <stop offset="0.99" style="stop-color:#9E0C00" id="stop3420"/>
            <stop offset="1" style="stop-color:#9E0C00" id="stop3422"/>
          </linearGradient>

          <linearGradient id="XMLID_28_" gradientUnits="userSpaceOnUse" x1="193.6235" y1="47.937" x2="173.1542" y2="26.0538">
            <stop offset="0" style="stop-color:#79130D" id="stop3427"/>
            <stop offset="0" style="stop-color:#79130D" id="stop3429"/>
            <stop offset="0.99" style="stop-color:#9E120B" id="stop3431"/>
            <stop offset="1" style="stop-color:#9E120B" id="stop3433"/>
          </linearGradient>


          <radialGradient id="XMLID_29_" cx="143.8315" cy="79.3882" r="50.3576" gradientUnits="userSpaceOnUse">
            <stop offset="0" style="stop-color:#A80D00" id="stop3440"/>
            <stop offset="0" style="stop-color:#A80D00" id="stop3442"/>
            <stop offset="0.99" style="stop-color:#7E0E08" id="stop3444"/>
            <stop offset="1" style="stop-color:#7E0E08" id="stop3446"/>
          </radialGradient>

          <radialGradient id="XMLID_30_" cx="74.0923" cy="145.751" r="66.9437" gradientUnits="userSpaceOnUse">
            <stop offset="0" style="stop-color:#A30C00" id="stop3451"/>
            <stop offset="0" style="stop-color:#A30C00" id="stop3453"/>
            <stop offset="0.99" style="stop-color:#800E08" id="stop3455"/>
            <stop offset="1" style="stop-color:#800E08" id="stop3457"/>
          </radialGradient>

          <linearGradient id="XMLID_31_" gradientUnits="userSpaceOnUse" x1="26.6699" y1="197.3359" x2="9.9887" y2="140.742">
            <stop offset="0" style="stop-color:#8B2114" id="stop3462"/>
            <stop offset="0" style="stop-color:#8B2114" id="stop3464"/>
            <stop offset="0.43" style="stop-color:#9E100A" id="stop3466"/>
            <stop offset="0.99" style="stop-color:#B3100C" id="stop3468"/>
            <stop offset="1" style="stop-color:#B3100C" id="stop3470"/>
          </linearGradient>

          <linearGradient id="XMLID_32_" gradientUnits="userSpaceOnUse" x1="154.6411" y1="9.7979" x2="192.039" y2="26.3059">
            <stop offset="0" style="stop-color:#B31000" id="stop3475"/>
            <stop offset="0" style="stop-color:#B31000" id="stop3477"/>
            <stop offset="0.44" style="stop-color:#910F08" id="stop3479"/>
            <stop offset="0.99" style="stop-color:#791C12" id="stop3481"/>
            <stop offset="1" style="stop-color:#791C12" id="stop3483"/>
          </linearGradient>

          <polygon style="fill:url(#linearGradient3448);fill-rule:evenodd" clip-rule="evenodd" points="153.5,130.41 40.38,197.58 186.849,187.641 198.13,39.95 " id="polygon3282"/><polygon style="fill:url(#XMLID_18_-7);fill-rule:evenodd" clip-rule="evenodd" points="187.089,187.54 174.5,100.65 140.209,145.93 " id="polygon3293"/><polygon style="fill:url(#XMLID_19_-4);fill-rule:evenodd" clip-rule="evenodd" points="187.259,187.54 95.03,180.3 40.87,197.391 " id="polygon3304"/><polygon style="fill:url(#XMLID_20_-9);fill-rule:evenodd" clip-rule="evenodd" points="41,197.41 64.04,121.93 13.34,132.771 " id="polygon3319"/><polygon style="fill:url(#XMLID_21_-3);fill-rule:evenodd" clip-rule="evenodd" points="140.2,146.18 119,63.14 58.33,120.01 " id="polygon3334"/><polygon style="fill:url(#XMLID_22_-7);fill-rule:evenodd" clip-rule="evenodd" points="193.32,64.31 135.97,17.47 120,69.1 " id="polygon3349"/><polygon style="fill:url(#XMLID_23_-9);fill-rule:evenodd" clip-rule="evenodd" points="166.5,0.77 132.77,19.41 111.49,0.52 " id="polygon3362"/><polygon style="fill:url(#XMLID_24_-3);fill-rule:evenodd" clip-rule="evenodd" points="0,158.09 14.13,132.32 2.7,101.62 " id="polygon3375"/><path style="fill:#ffffff;fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 1.94,100.65 11.5,32.62 49.97,-11.211 57.05,-53.02 L 136.56,17.9 111.209,0 68.109,16.13 C 54.53,28.76 28.18,53.75 27.23,54.22 26.29,54.7 9.83,85.81 1.94,100.65 z" id="path3377"/><path style="fill:url(#XMLID_25_-9);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 42.32,42.05 c 29.43,-29.18 67.37,-46.42 81.93,-31.73 14.551,14.69 -0.88,50.39 -30.31,79.56 -29.43,29.17 -66.9,47.36 -81.45,32.67 -14.56,-14.68 0.4,-51.33 29.83,-80.5 z" id="path3400"/><path style="fill:url(#XMLID_26_-2);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 41,197.38 22.86,-75.72 75.92,24.39 C 112.33,171.79 81.8,193.55 41,197.38 z" id="path3413"/><path style="fill:url(#XMLID_27_-1);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 120.56,68.89 19.49,77.2 C 162.98,121.98 183.56,96.06 193.639,64 l -73.079,4.89 z" id="path3424"/><path style="fill:url(#XMLID_28_-1);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 193.44,64.39 c 7.8,-23.54 9.6,-57.31 -27.181,-63.58 l -30.18,16.67 57.361,46.91 z" id="path3435"/><path style="fill:#9e1209;fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 0,157.75 c 1.08,38.851 29.11,39.43 41.05,39.771 L 13.47,133.11 0,157.75 z" id="path3437"/><path style="fill:url(#XMLID_29_-4);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 120.669,69.01 c 17.62,10.83 53.131,32.58 53.851,32.98 1.119,0.63 15.31,-23.93 18.53,-37.81 l -72.381,4.83 z" id="path3448"/><path style="fill:url(#XMLID_30_-6);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 63.83,121.66 30.56,58.96 c 18.07,-9.8 32.22,-21.74 45.18,-34.53 L 63.83,121.66 z" id="path3459"/><path style="fill:url(#XMLID_31_-6);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 13.35,133.19 -4.33,51.56 c 8.17,11.16 19.41,12.13 31.2,11.26 -8.53,-21.23 -25.57,-63.68 -26.87,-62.82 z" id="path3472"/><path style="fill:url(#XMLID_32_-0);fill-rule:evenodd" inkscape:connector-curvature="0" clip-rule="evenodd" d="m 135.9,17.61 60.71,8.52 C 193.37,12.4 183.42,3.54 166.46,0.77 L 135.9,17.61 z" id="path3485"/></svg>
        </template>
        <template #title>Ruby</template>
        <template #description>
          Consume your API with Ruby
        </template>
      </InstallLink>
    </div>

    <!-- Python -->
    <div>
      <InstallLink link="../getting-started/python.html">
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="2500" height="2490" viewBox="0 0 256 255" preserveAspectRatio="xMinYMin meet"><defs><linearGradient x1="12.959%" y1="12.039%" x2="79.639%" y2="78.201%" id="a"><stop stop-color="#387EB8" offset="0%"/><stop stop-color="#366994" offset="100%"/></linearGradient><linearGradient x1="19.128%" y1="20.579%" x2="90.742%" y2="88.429%" id="b"><stop stop-color="#FFE052" offset="0%"/><stop stop-color="#FFC331" offset="100%"/></linearGradient></defs><path d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z" fill="url(#a)"/><path d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z" fill="url(#b)"/></svg>
        </template>
        <template #title>Python</template>
        <template #description>
          Consume your API with Python
        </template>
      </InstallLink>
    </div>


  </div>
</template>

<script>
import InstallLink from "./InstallLink.vue"

	export default {
		components: {
			InstallLink
		}
	}
</script>
