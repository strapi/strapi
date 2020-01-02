import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  html {
    font-size: 62.5%;
  }

  body {
    font-family: 'Lato';
    font-size: 1.4rem;
    line-height: 1.5;
    color: #292b2c;
  }

  // ::-webkit-scrollbar {
  //   width: 0;
  // }

  * {
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
    font-family: 'Lato';
  }

  h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6 {
    line-height: 1.1;
  }

  .btn {
    font-size: 1.4rem;
    padding: 0;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  /*
   * Override
   */

  .modal {
    background: transparent;
    .modal-dialog {
      max-width: 74.5rem;
      margin: 16rem auto 3rem calc(50% - #{$left-menu-width});
      position: relative;
      z-index: 999;
    }
  }

  .modal-backdrop.show {
    opacity: 0.15;
  }


  .modal-content {
    border-radius: .2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    border: none;

  }

  .modal-header {
    button {
      &.close {
        margin: 0;
        padding: 2rem;
      }
    }
  }

  .modal-body {
    .video-react {
      background: transparent;
    }
  }
  form .row {
    text-align: left;
  }

  .form-check {
    padding-left: 0;
    .form-check-label {
      padding-left: 1.25rem;
    }
  }

  .form-control:focus {
    outline: none;
    box-shadow: none;
  }

  textarea.form-control {
    height: 10.6rem;
  }

  .input-group-addon {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .btn-secondary:not(:disabled):not(.disabled):active:focus,
  .btn-secondary:not(:disabled):not(.disabled).active:focus,
  .btn-secondary,
  .show > .btn-secondary.dropdown-toggle:focus {
    &:focus, &:active, &:hover, &.focus {
      box-shadow: 0 0 0 0px rgba(134,142,150,0.5);
      color: rgb(51, 55, 64);
      background-color: rgb(250, 250, 251) !important;

    }
  }

  /*
   * Notifications animation
   */

  .notification-enter {
    opacity: 0.01;
    top: -60px;
  }

  .notification-enter.notification-enter-active {
    opacity: 1;
    transition: all 400ms ease-in;
    top: 0;
  }

  .notification-exit {
    opacity: 1;
  }

  .notification-exit.notification-exit-active {
    opacity: 0.01;
    transition: all 400ms ease-in;
  }


`;

export default GlobalStyle;
