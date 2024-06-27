import { Outlet } from 'react-router-dom'
import Header from "./Header"
import SideBar from './SideBar'

const Layout = () => {
    return (
        <>
            <Header />
            <main className='App flex'>
                <SideBar className="sm:w-96  md:w-60" />
                <Outlet className="flex-grow" />
            </main>
        </>
    )
}

export default Layout