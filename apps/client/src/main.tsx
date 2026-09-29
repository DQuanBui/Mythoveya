import {createRoot} from 'react-dom/client';
import {Component,type ReactNode} from 'react';
import App from './App';
import './style.css';
class Boundary extends Component<{children:ReactNode},{error:string}>{state={error:''};static getDerivedStateFromError(e:Error){return {error:e.message};}render(){return this.state.error?<div className="panel fatal"><h1>The rift needs a moment.</h1><p>{this.state.error}</p><p>Make sure hardware acceleration is enabled and the local server is running.</p><button onClick={()=>location.reload()}>Reload game</button></div>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
