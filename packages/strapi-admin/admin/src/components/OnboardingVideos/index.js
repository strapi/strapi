/*
 *
 * Row
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import PopUpVideo from 'components/PopUpVideo';

import styles from './styles.scss';
const videos = [
  {
    title: 'Create your first content-type',
    id: 0,
    url:
      'https://s3.amazonaws.com/codecademy-content/courses/React/react_video-cute.mp4',
    thumb:
      'https://www.santevet.com/upload/admin/images/article/Chat%202/chaton_seul/santevet_chats_en_location.jpg',
    time: '1:32min',
    end: true,
  },
  {
    title: 'Fill your content with data',
    id: 1,
    url:
      'https://s3.amazonaws.com/codecademy-content/courses/React/react_video-eek.mp4',
    thumb:
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUTEhMWFRUXGBUVGBgXGBcXFhgYGBcXFxUXGhUYHSggGBolHRUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0NFRAQFSsdFR0rLS0tKy0tKy0tLS0rLS0rLS0tLS0tLS0tLS0tLS0rLS0tLTc3Ky0tLS0tKy0tLS03N//AABEIALcBEwMBIgACEQEDEQH/xAAcAAACAgMBAQAAAAAAAAAAAAADBAACAQUGBwj/xAA8EAABAwIDBQcCBgEDAwUAAAABAAIRAyEEMUEFElFhcRMigZGhsfAGwRQyUtHh8UIjYnIHFZIzU2Oiwv/EABkBAQEBAQEBAAAAAAAAAAAAAAEAAgMEBf/EAB4RAQEBAAIDAQEBAAAAAAAAAAABEQISAyExQRME/9oADAMBAAIRAxEAPwDz9tIFY3CEZuSYY2QvXjjSzCiNKK6iIyug7pCmMMMRJQGFFBWoF2orAhtRWBaQoCsGrDUQBSY3VYNVgFcNQgw1WhW3U3Q2c92irZGiMKzKZJgCV0OE2Bk435Lb0dkNDgQLrly83GNzx2uXw+xqjsxC22C+nwAC65+FdLSw6YZSC8/LzWuvHxSNPQ2a28NyjRP08IBonWtCuAIXK8rXSSQkMMFbsgmXLBaggdnyVYRHO0QiDHihI5DOSI5qoognVVsrEG6FUBCkoQquKw0nzV6gDR0UAHPWD7qjhqskJStQQk6jE05pJVKgjqfQKDXOp8lEfeKiQ86pJumNErRF021t19CPMM1khWfQkALNLIo9JiU1ZpwYKI0JjGsuDxQmhZc79WaEVoVWhGaFrQjQisKwArsYTYJ1LNKfwOBdUvpfz4J/ZWwibuC6vB4AAWbC4eTzSeo7cPHb9afB7GaADHBbijghay2FOiAFYheXl5LXonCQuyhCu2miFQBY1pUNUhEUIUgXFVLlaq1LvKkPvK4qBJPqKdopGCVCEJpm5V6jrdclFRzku+reEWoYHMoEQZ1+6gIxqXrmTARXOI6qhsJUg2U8zOSjwCFkBYabqQdRmSXq8kyTKoGeSkXhVqX6BFA18EKqybBSUtoFFglRKectZBTNMShbiOGr6LyjNGSYptQWt1TFEJCmJpbw5i6SaxbtrUs+heEM2E2hFaFl1OFkIZxlomwXWbB2MIDnZ80n9ObNcSHEAg8fcFdzhMMGhcPL5fyO/i8f7VcLhQEyFbdWCxeS16GCUMosITgjSxKsCh70Ku8pDb6waqE4KoaUhdz0u8qzvnNC3tdEoOoEEviAUd5tOiTIvJSKcY7JXa4kz5JJ1XXzR6VTipaYfbmcygEx1+SoKsqgE3OSihPr6IYO8ZNgMufBYB3r5Dn6lXDvLT9/ZQSo/wBFkCAh7t5yHur/AJvnmgsBsoFSbDRMuFkJ4g8/QKJeq3yCWxNWIAsfZNVTcBBxNGBOpUihrRk0nmos9lxhRQcQwIoFlWm1GDV9DXmWppiigsCOwJgMo1JoPVAHNFp5oCtfDzcZpTC0pqATF1s03srDh1QWlHK5F12ur2ZhdxoH2WyCHhqUAIrqa+fyr1yMFywChuaUMVFho0ShVeKrvyhVKkZqSPOitCXpvnW5kDwMFXa+3mfnmkCtf8+dVje0StR/DT586LHapQr+aXdzWKhkjh6IVR4nn8slLVKk5ZDJK1HfPVFY7iVKpsSOi0KA6pGs8llrzGaDuXyFryr74GfXglkyKk5K1QmPnsle2nTTorAunXn/AGojVXid0clneQKTcyMyc/umKMNE2JOSElQTc6ZD54piiLXsNf25oRfGefr/AAs0pceQQRKkaJare5y9ymS4fZL16Y16wggA5k5eqpVvyHqmNwa+AVSQMhKkT7LkVhHLqmhgcFFanA0gjNasMp6owC9+vMq1qLTao0I0JDDEVqoAiQkLFy6T6Yw+pHQ/ZcrvSYXof05h4YPBcfPc4t+P3W7w9KyrjcRTpCXnoNSeQTDBAXjX/VP6zc2s2nRz3ZJjIE2HUxPSF4p7uPT8mvU+3a9u8whw5e1tf2WpqVn9uAB3C0yf9wIA9yuF+iNu9puufUayoSGCAW7xnJzcoNwDxBzgx6FSojePUlNmCXR2mEli9fIcj8PonX2WtxFS2cafafJELndp7dNOvTYGF3aPbTtkJMn0XWjDkNgm+p5fay5jB1x2hqRebdQLCfNT6l+pWYcAOMuIEgECBAkud1yA9rLWM66DsxBJIifARx8EM0zmBneTYR8915tW/wCozLNZb/k4npHdga8F030l9Vsr1BRqNAdUjccXEhx/TvQfDoctW8cWuhLRa8pLGv3SDJOnBbrEYe865ftZanH4Mum/zp5LMrStIA97PPl8CuSenzRAoNgD2RpM8AtMqvcNT4/wl6jhxvrxR3RogvoE3AyTBWKcAXzRWVYF78vdKBhm59ERo0E8zokCb9otz4dEVjJMz0EFLkDQ5eU8eaKyrz80GHGwLCSfv11RSbQAB84pN7o19ZvqjUN43M9Bl4oaEHz28ETcGtvnqrgH+vllktjr8sOCyQS08PD+Es9upPmmKm8dQB88ShVKZyEAcTn4DTqpFC3/AHeQn3UR90cR6qKWOFarygCpxSgqkle6e3nrZhwGasKq1wYTqjNK3Ixp8VFYOS1KomAEgfANBeJMeq9P2KyGBebbGZ/qi69O2b+ULy/6L7dvFFtt1S2g8jhHnZfMv1xiScbWBEBryB0AaJ/+oHgvpra+HL6ZAuuMd9JUaj+0q0W74I73+RjjFjpdefhcrrymx5Fs04ipi6danTcJDGsIaA126A0G1sokZ2Ot19AUgIQMBsOmw7waN79Ru7j+Y3K21OkB88U8uWrjMImjDT18tfnVaParbEcd6fPL1IXT4qI8/RaHF0wSTxifGZ91mQ1y+IqljHv1aHGBqQDbmYE+Earx/au1DVkXu5ziePIdTJ8Rwv75VwrHNLTrJPU3d0uPUaErx361+k3Yepv0iXNdJI55kNvLgJH8rtxrnycittsjarsPUY8TDXNqDk5pBkexGoJWtBAzBlbDZmy34io1jQe8QwaS5xAA6az1Wqy+nMPV7RjX/ra10WtvCYsTGaTxdEgyR8tnPNPYSj2bGtmQ1rWCODRA4fshY2Tpbn/a8s+u7TboB4n2CC83j1MegTNUnSEs8c10jKZa+yw7EkAga65FVNMfJ9kGoUpUNnRWdUi2iq5xH8IZe3XNQXcdT+yzTdJz8ku5oKLTbA+AeKkcokNHeic8pTVKtOQPzqkTXbI+1h04lP0nE3y8lmk0ydfdZflYSqMdP9z7KxZxQ0W7PkiEiLBXtwnoqkcB881Ituu5KK5qD9LvVRSeVYirJA0CyxJsKZY5fRnp5KdpORmiUpTcm6RWgvuQiNqKryhgqTcbIf8A6gXpmznd0QvJsA7vtnivVNjPlgXl/wBEdfGezQ6lMBM0bFKYhwmSbLyu7Dn29hxSWI2gyme+8Az10Wp27t1jJ/SRDXC4mYNxkuEx+0S+qQH92o4gEmSxwjukg/7mf+XVakGvRX7bY4HvggZxz5dUm+sX1DTAh26HchvGx8L+S8nx2MrNrvp0HEll3OAENE6zYXOX7FepfR1V3ZAVX7z91gc6fzEC5GsTYJzBqV3jURqRb1jz8L8FotuVLHehwsb+l7QBpcH1nd7WdkJgSQAATPP1+WjUY6nNM7tueYHlrz91riK5OrsJj5NM03XycMvGD7roPovYAbWFaqW9wHs2tNpIgvPQEx15JbZ+zzTzcDMnIn7Le4Kvccuf2Tzo4uybW1CDiao6/OCSwuJ8Uw92haI+ZLjjoSqRnIHzggVI0j7IlZt0IlaAZbqgvCNUEIDioBOHzVU3D1ViUPehOpkW+Qrhw/y9MlQsGp6KtNoGs+qkfoMGmXQE58U/hWgfqPskMPV16fLLaNFsuqzTFwJ4ALJb8lVdMW00FyssIjI/OiNKjsot4f0qPaOHnf0WX028J+cFQujkjSg6H/x/hRUhvNRSeRVW7riPLpoiMKrjnXB1Qqb19KX08lPMKapOWvY9bDBCbrQMOdZUa5NNhY/DAq0YCx9wvR/pnFjcAvwk5eGpXADChb36dxYpO72eQ1JnguXmm8W+FyvQn1beGW46/gTdabbNYgSInQEljdZsc7J8VyWjnwkNvcAf5PP2vC1u2ASzJpgH83lAjTMRqTwXjehwf1dU35HZkboIJY4kS3vtBaBFxJM8s0liKDDSw9An/WpYmk7tBc9nVJ3/APluinrOaPtqi78riA2TMWBEO3gASC90TyyIWjLHuxVJwBjebM8J1BygGPBajNbnHbCbTqvotcTTBLzkalVxLd8k2EnugAR6FbjDY+nTBO82n2b2lwZmWnuta4EZmyLtzAuaW8CWjddG5O+wjPJ+e6cs81o8RXLAW9puncd3aolzd1wAO9NxlqY3m5XQW8xe0y+od8BoLoYSYJGknQnhdMhvdMifNx9rLmcEN50u3n94Tq1pjNo4a2Gvl1uzQSwZEi0i0+GRW/jLX7lov4KuHRsQRvER9lbD01ztah7DvhOmvI4+4SDAjtdCGhpnNBcs7yo9ykG9yC9WqFDqFCA3YKwfBXLs+qykYDfQweijaZdrBHWEVyPhxGQ+6tWGMJS3YkynWmI/c/Cl6brQittCza1hxrhf3VCeF0N7z/NlGdT5LOlAb/lHjKq9Vqm/Pj/arv8AE+SNSeHr/KiCazdSPRROp4+6TcrLAnqtOVRlOF9OV5LEpUCVtaMAJJr0Vrk6DzXojXpOkUUFSOseozFOY4uaYtExNjn9+tglg9GpuBBnSHeRsOkwq/BHZ/S2Mc7/ANSppJA/MG/oB0JJEnO8zlHQ4rDkjgdQMrC4HANEAHiSdAvMdnYx1NxIMXGk3vHWF3exNrB8scSTDmyeuvWBA5eC8fk4ZXfhyc79U7LeD3QXSQO6PCS4Xi38Lmsd9OV5mpVgZ7rd4AeIHTNew1KbTfjfzQK1MLnx5Vux59sqpXDHMxJbVbYNqC5HJ8WcNbwc/AON2UXEFjjuw8j/ACkF28LuE8QBcei7ivRAkgCTrw5+y0lXZzS4kbzeO6XAGOQMap7LGvw+yt0GTxtYNcJkDjMZH91tt1rBY/my52yPE59b8Ep+AFs5IBk3JIGV0dlG26cjlyM2jocvDgUdtWAfhwSZ8v5+6LTpwiMBIBiCJB8M/wBx4I26ghgKwWd1YlSQlCqOVnuS1RyEwSqEqSsSpMKrgrEqsK0rs0CZptt0ulpi6zvO/wARe3His2rDofdMhwGfX+lrnPDLusqU6jnm/P5zXPlzxuQ+a+mir+I55x4qUMJkTdMnDBY20ly6bZrDGg/J9FY04JP9BDdUB4QtQMbnGPIKJepWuYc2FFrU86D0VlJ0ZLoKmxabactJJAmfH2z9FtPpzZjH3c0HrkPPMr6PaSa8vVx7Kbjomfwp0ufmq7iv9PsmQIHAWQ6WxgJcQS0HS3lxR/SHo5GlhHkxEdVZ2FeDlPMZLrWbLDjAtbqehR37CcI73WRkr+g6OLFF36T5IjKZ4G9svnBdd/2VwMB4i3FR2ynaDeHEW8Y0V/VdHIh0SOXqIP29U3gMduOtqZPX5Pot5idlg/mafJJO2ExxG5vc4+WRecs9rrY6LZm3g4AH4PnsVuQ6RK4tmw6rDaQL5i63OEqVg2w3t0DpHwD1XDlJ+OnG39bSrTlL/h81luIeT+QxMfyrPxGdiPBc8bCfhfy8j9j/AAqtwwuD8tYq34weqwcWJz4JDD2iZjOCeuRPiAEBzIV6tWCehS5r5z1UUcgPeh18UJt8+WSNXFXIUjNWqgl6Rdi1T8TzQmwDlC5I/iQstxF0I7KvSYXODRmUm2uuh2bhNxu88d86cBw6oK9HBsbaJPFN06YjKEu2sJjX5qjPqwJJt6JRfGYcPaZSNMtpXje9EbF4sGzTPRabEbziY0BPlGfBXWX6tdDhdu0CII3euSMcfScO64HxXAuMEzeNMotbr4JE4giSJEaDr/af5wdnodd4WrxVSByXLUtrvGTiiO20TmVdF2bj8V1UWhdtUc/NRXVdh21z+XwW/wBiRHePhMLmQ6SFucHXgiOq9fL44x1FGqwmADp/N1uqFEQLLTbLZrGd8lu6ROS410jLcOAIACw5iMDBKu26EVFNZNP9k4KcrO4nU1bqZGYkrNJpmVsXDldUfh4Tqa+rUvnytdVdiHQYMJs4WfH0Va+EsDInpdXoB0sQ63z2WXYri31QgCpufP4V1i1K7WOAJE6fwlXbNZGs/tHomWMFxkqhpmxiBZXWLSVTZbf/AHH9IB55/MkvV2OTvRVjQAtvHMyt0ABBIz4ImKbIBBuEdTrj6+wawu2owmcjLfWDdLs+mcQd8vcxsDu3ned/+RbP0XahggggSOKqYiJidQjqtec/9hxf6Gm+j2+t1K+wsW0T2W8JjuEOOl44Xz5L0IUyMifIK9QWu4/Omiuq15PQNV7t1rHEzuxBz4Iru1Y4tcxwcJMROVjl0XpdOjBgSOYy6qlVjXRvNEc/nos9S5D6Qb2teTcMG946fOi63HAwbxNp4DU+U+YTGBwtOkTuMa3e/SM9fJKbWMtcOIPsVmzDGj2XtXtqrw0Hs22BgAEzBvPuFqvrv6h7INoMJ36mZGjTa3Em6L9NkNBBIO6SY4TJac9RNzwK5n6zwRq7RZGXYMeNZBc+c/JMk1e3XbFA7Fg/KIAgEWHgBOWllqfqnbow1MBouTHCePhdNbLpObTBLOzbG8GC3daIpAn1XEbec7F1mMpg7wAcd6MzJ7s3IiDHLkUybRb6dDSx7n0Wuc3dLgOpi2fHILXYhhkgX/LJ8DBv0PwJunSdTos3+6GSTvERIYYudTJIAXNbQ2g+pVAbBDntdAsO6HA30jePkt8Yza2ReWyCft/aq+qIkG/20CVpv3nPa4yYEuBMZ2aJNv7QahcQCMhIB4iY8xfNaxnTZqc/b91Frn12ttIyHE5gE+6isWun2Y6QN68ZeS6PZVEkSNIuVFF05COrwEtHGy3VF9lFFxrrBe0RKTlhRCEDimKb1FFJhzVRRRSYhYcxRRKCNFDfSUUVApuqjqSii0Ay26xVbIWFEpK7TAIudZVKRcInioopBufLp4Z3WHVI6GyiiUxRqnW4RA1rnWCiiKhd2Gwc0CpQkSb6XWFEEg3ZrAXENbLrG1yBNvVJP2LSNZlQtl1Nr6e7oWkggTy70cJUUWbxi0ntjCPdIbYExflp84lclhGVaRrjPvgiIbYtk94GTc5HgoojE031BiqlUCnuBjS6+73nEn8s7x5DXTwQx9POp094uJHAd3eOoJmeNpi/ioonRgNKm6GtY22biCBl+Vt8szb1KDUwtSe8Tf8A4gDylRRaZwMYH/5iOQ3rKKKJD//Z',
    time: '1:32min',
    end: false,
  },
  {
    title: 'Manage the API access',
    id: 2,
    url:
      'https://s3.amazonaws.com/codecademy-content/courses/React/react_video-slow.mp4',
    thumb:
      'https://www.santevet.com/upload/admin/images/article/Chat%202/chaton_seul/santevet_chats_en_location.jpg',
    time: '1:32min',
    end: false,
  },
  {
    title: 'Fetch data through the API',
    id: 3,
    url:
      'https://s3.amazonaws.com/codecademy-content/courses/React/react_video-fast.mp4',
    thumb:
      'https://www.santevet.com/upload/admin/images/article/Chat%202/chaton_seul/santevet_chats_en_location.jpg',
    time: '1:15min',
    end: false,
  },
];

class OnboardingVideos extends React.Component {
  state = { showVideos: false, showModal: false, video: '' };

  // componentWillReceiveProps(nextProps) {
  //   //if (nextProps.pluginActionSucceeded !== this.props.pluginActionSucceeded) {
  //   this.setState({ showModal: false });
  //   //}
  // }
  componentDidMount() {
    this.setState({ showVideos: true });
  }
  toggleVideos = e => {
    this.setState({ showVideos: !this.state.showVideos });
  };

  displayModal = e => {
    e.preventDefault();
    let video = videos[e.currentTarget.parentNode.key];
    console.log(e.currentTarget.parentNode);
    console.log(video);
    this.setState({ showModal: !this.state.showModal });
  };

  render() {
    return (
      <div className={styles.videosWrapper}>
        <div
          className={cn(
            styles.videosContent,
            this.state.showVideos ? styles.shown : styles.hide,
          )}
        >
          <div className={styles.videosHeader}>
            <p>Get started video</p>
            <p>25% completed</p>
          </div>
          <ul>
            {videos.map(video => {
              return (
                <li
                  key={video.id}
                  id={'nonProps.index.isOpen'}
                  className={video.end ? styles.finished : ''}
                >
                  <a onClick={this.displayModal}>
                    <div className={styles.thumbWrapper}>
                      <img src={video.thumb} />
                      <div className={styles.play} />
                    </div>
                    <div className={styles.txtWrapper}>
                      <p className={styles.title}>{video.title}</p>
                      <p className={styles.time}>{video.time}</p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.openBtn}>
          <button
            onClick={this.toggleVideos}
            className={this.state.showVideos ? styles.active : ''}
          >
            <i className="fa fa-question" />
            <i className="fa fa-times" />
            <span />
          </button>
        </div>

        <PopUpVideo
          isOpen={this.state.showModal}
          toggleModal={() =>
            this.setState({ showModal: !this.state.showModal })
          }
          popUpWarningType="danger"
          onConfirm={this.props.onDeleteConfirm}
          src="https://s3.amazonaws.com/codecademy-content/courses/React/react_video-cute.mp4"
        />
      </div>
    );
  }
}

OnboardingVideos.contextTypes = {};

OnboardingVideos.propTypes = {};

export default OnboardingVideos;
